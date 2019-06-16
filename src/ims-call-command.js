/*
Copyright 2018 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const { flags } = require('@oclif/command')
const ImsBaseCommand = require('./ims-base-command')
const { getToken } = require('./token-utils')
const { Ims, ACCESS_TOKEN } = require('@adobe/aio-cli-ims')
const debug = require('debug')('@adobe/aio-cli-plugin-ims/ims-call-command');

class ImsCallCommand extends ImsBaseCommand {
    async call(ims, api, token, parameterMap) {
        debug("call(%s, %s, %o)", api, token, parameterMap);
        return Promise.reject(new Error("This function cannot be called directly"));
    }

    async run() {
        const { args, flags } = this.parse(ImsCallCommand);

        const { name: ctx, data: contextData } = this.getContext(flags.ctx);
        debug("ImsCallCommand:contextData - %O", contextData);

        if (!contextData) {
            this.error(`IMS context '${ctx}' is not configured`, { exit: 1 });
        }

        if (!args.api || !args.api.startsWith("/ims/")) {
            this.error(`Invalid IMS API '${args.api}' - must start with '/ims/'`, { exit: 1 });
        }

        let data = {}
        if (flags.data) {
            for (const val of flags.data) {
                data[val[0]] = val[1];
            }
        }

        debug("Context: %s", ctx);
        debug("API    : %s", args.api);
        debug("Params : %o", data);

        try {
            const ims = new Ims(contextData.env);
            await getToken(contextData[ACCESS_TOKEN])
                .then(token => this.call(ims, args.api, token, data))
                .then(result => this.printObject(result))
        } catch (err) {
            debug("error: %o", err);
            let reason;
            if (err.statusCode) {
                switch (err.statusCode) {
                    case 404: // NOT FOUND
                        reason = "API does not exist";
                        break;
                    default:
                        reason = err.error.error_description;
                        break;
                }
            } else {
                reason = (err.message || err);
            }
            this.error(`Failed calling ${args.api}\nReason: ${reason}`, { exit: 1 });
        }
    }
}

ImsCallCommand.description = `
This is a raw and low level IMS API call command taking the IMS API
path as the first argument and any additional request parameters
as optional additional arguments.

The API result is printed as an object if successful. If the call
fails, the error message is returned as an error.
`

ImsCallCommand.parameterParser = input => input.split("=");

ImsCallCommand.flags = {
    ...ImsBaseCommand.flags,

    data: flags.string({ char: 'd', description: 'Request parameter in the form of name=value. Repeat for multiple parameters', multiple: true, parse: ImsCallCommand.parameterParser })
}

ImsCallCommand.args = [
    ...ImsBaseCommand.args,

    { name: 'api', description: 'The IMS API to call, for example: /ims/profile/v1', required: true }
]

module.exports = ImsCallCommand
