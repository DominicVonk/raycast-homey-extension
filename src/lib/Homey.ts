import { LocalStorage } from "@raycast/api";
import { AthomCloudAPI, HomeyAPI } from "homey-api";
import { OAuth } from "@raycast/api";
import express from 'express';
import { Storage } from "./Storage";
export class Homey {
    private user: AthomCloudAPI.User;
    private homey: HomeyAPI.Homey;
    private homeyApi: HomeyAPI;

    getHomey () {
        return this.homey;
    }

    async auth () {
        if (!this.user) {
            let token = null;
            const code = await LocalStorage.getItem<string>('_token') as string;
            let __token = undefined;
            if (code) {

                //@ts-ignore
                __token = new AthomCloudAPI.Token(JSON.parse(code));
            }
            // Create a Cloud API instance
            const cloudApi = new AthomCloudAPI({
                clientId: '5a8d4ca6eb9f7a2c9d6ccf6d',
                clientSecret: 'e3ace394af9f615857ceaa61b053f966ddcfb12a',
                redirectUrl: 'http://localhost/oauth2/callback',

                //@ts-ignore
                token: __token,
                store: new Storage()
            });
            const loggedIn = await cloudApi.isLoggedIn();
            if (!loggedIn) {


                const client = new OAuth.PKCEClient({
                    redirectMethod: OAuth.RedirectMethod.Web,
                    providerName: "Homey",
                    providerIcon: "8502422.png",
                    description: "Connect your Homey account...",

                });

                const promise = new Promise((resolve, reject) => {

                    const server = express();
                    let _server: any = null;
                    let state: any = null;
                    server.get('/oauth2/callback', async (req, res) => {
                        const token = req.query.code;

                        res.redirect('https://raycast.com/redirect?packageName=Extension&state=' + state + '&code=' + token);

                        _server?.close();
                        resolve(token)
                    });

                    server.get('/oauth2', async (req, res) => {
                        state = req.query.state;

                        //@ts-ignore
                        res.redirect(cloudApi.getLoginUrl());
                    });

                    _server = server.listen(80);
                });
                const request = await client.authorizationRequest({
                    scope: "homey",
                    clientId: '5a8d4ca6eb9f7a2c9d6ccf6d',
                    endpoint: "http://localhost/oauth2",
                });
                try {
                    const req = await client.authorize(request);
                } catch (error) {
                    console.log(error);
                }
                const data = await promise;
                token = (data as string)

            }

            if (token) {
                //@ts-ignore
                const _token = await cloudApi.authenticateWithAuthorizationCode({ code: token });
                await LocalStorage.setItem('_token', JSON.stringify(_token));
            }
            // Get the logged in user
            this.user = (await cloudApi.getAuthenticatedUser({ additionalScopes: '' })) as AthomCloudAPI.User;
        }
    }
    async selectFirstHomey () {
        if (!this.homey) {
            const homey = await this.user.getFirstHomey();
            this.homey = homey;
            // Create a session on this Homey

            //@ts-ignore
            const homeyApi = await this.homey.authenticate();

            this.homeyApi = homeyApi;
        }
    }

    async getFlowsWithFolders () {
        const directory: { [key: string]: { name: string, order: number, flows: any[] } } = {}
        const flowFolders = await this.homeyApi.flow.getFlowFolders();
        const folders = Object.values(flowFolders);
        directory['general'] = {
            id: 'general',
            name: 'general',
            order: 9999,
            flows: []
        };
        for (const folder of folders) {
            directory[folder.id] = {
                id: folder.id,
                name: folder.name,
                order: folder.order,
                flows: []
            };
        }
        //@ts-ignore
        const todos = await this.homeyApi.flow.getFlows();
        const flows = Object.values(todos);
        for (const flow of flows) {
            directory[flow.folder || 'general'].flows.push(flow);
        }
        //@ts-ignore
        const todos2 = await this.homeyApi.flow.getAdvancedFlows();
        const flows2 = Object.values(todos2);
        for (const flow of flows2) {
            flow.advanced = true;
            directory[flow.folder || 'general'].flows.push(flow);
        }
        return Object.values(directory);
    }

    async getDevicesInGroups () {
        const directory: { [key: string]: { name: string, order: number, flows: any[] } } = {}
        const flowFolders = await this.homeyApi.zones.getZones();
        const folders = Object.values(flowFolders);
        directory['general'] = {
            id: 'general',
            name: 'general',
            order: 9999,
            flows: []
        };
        for (const folder of folders) {
            directory[folder.id] = {
                id: folder.id,
                name: folder.name,
                devices: []
            };
        }
        //@ts-ignore
        const todos = await this.homeyApi.devices.getDevices();
        const flows = Object.values(todos);
        for (const flow of flows) {
            directory[flow.zone || 'general'].devices.push(flow);
        }
        return Object.values(directory);
    }

    async triggerFlow (id, advanced = false) {
        if (advanced) {
            await this.homeyApi.flow.triggerAdvancedFlow({ id });
        } else {
            await this.homeyApi.flow.triggerFlow({ id: id });
        }
    }

    async toggleDevice (id) {
        const capability = await this.homeyApi.devices.getDevice({ id: id });
        const value = capability.capabilitiesObj.onoff.value;
        await this.homeyApi.devices.setCapabilityValue({ deviceId: id, capabilityId: 'onoff', value: !value });
    }

    async turnOnDevice (id) {
        await this.homeyApi.devices.setCapabilityValue({ deviceId: id, capabilityId: 'onoff', value: true });
    }

    async turnOffDevice (id) {
        await this.homeyApi.devices.setCapabilityValue({ deviceId: id, capabilityId: 'onoff', value: false });
    }

}
