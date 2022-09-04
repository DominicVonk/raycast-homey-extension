import { List, Action, ActionPanel, Icon, Color } from "@raycast/api";

import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { Homey } from "./lib/Homey";



export default function Command () {
    const [flows, setFlows] = useState<any[]>([
    ]);
    const [homey, setHomey] = useState<Homey>(new Homey());
    useEffect(() => {

        const fetchData = async () => {
            await homey.auth();
            await homey.selectFirstHomey();
            const flows = await homey.getFlowsWithFolders();
            //  console.log(todos);
            //@ts-ignore
            setFlows(flows);
        }
        fetchData();
    }, [homey]);

    return (
        <List>
            {flows.sort((a, b) => Math.sign(b.order - a.order)).map((folder) => (
                <List.Section key={folder.name} title={folder.name}>
                    {folder.flows && folder.flows.sort((a, b) => Math.sign(b.order - a.order)).map((flow) => (
                        <List.Item key={flow.id} icon={{ source: flow.triggerable && flow.enabled ? Icon.PlayFilled : Icon.XMarkCircleFilled, tintColor: flow.triggerable && flow.enabled ? Color.Green : Color.Red }} title={flow.name} actions={<ActionPanel title={flow.name}>
                            <ActionPanel.Section>
                                {flow.triggerable && flow.enabled && <Action title="Start Flow" onAction={async () => {

                                    //@ts-ignore
                                    homey.triggerFlow(flow.id);

                                    await showToast({
                                        title: "Flow triggered",
                                        message: flow.name,
                                        style: Toast.Style.Success,
                                    })
                                }}></Action>}
                                <Action.OpenInBrowser title="Goto Flow Editor" url={'https://my.homey.app/homeys/' + homey.getHomey().id + '/flows/' + flow.id}></Action.OpenInBrowser>
                            </ActionPanel.Section>
                        </ActionPanel>} />

                    ))}
                </List.Section>
            ))}
        </List>

    );
}