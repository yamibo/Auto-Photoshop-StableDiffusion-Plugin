import React from 'react'
import ReactDOM from 'react-dom/client'
import { observer } from 'mobx-react'
import { ErrorBoundary } from '../util/errorBoundary'
import { Collapsible } from '../util/collapsible'
import Locale from '../locale/locale'
import { PresetTypeEnum } from '../util/ts/enum'
import {
    getAllCustomPresetsSettings,
    getCustomPresetsNames,
    getLoadedPresets,
    deleteCustomPresetSettings,
    // getPresetType,
    loadPresetSettingsFromFile,
    preset_tab_store,
    saveCustomPresetSettings,
    store,
    updatePresetMenuEvent,
    // updatePresetMenuEvent,
} from './shared_ui_preset'
import { controlnet_preset, general, html_manip, io } from '../util/oldSystem'
import { AStore } from '../main/astore'
import { reaction, toJS } from 'mobx'
import { getUnitsData, setUnitData } from '../controlnet/entry'
import { SpMenu } from '../util/elements'
import { controlNetUnitData } from '../controlnet/store'
import { sd_tab_store } from '../stores'
import { storeToPreset, writePreset } from '../util/ts/io'
import { createGenerationPreset } from './generation_settings'
declare let g_ui_settings_object: any

reaction(
    () => {
        return preset_tab_store.data.new_preset
    },
    (current_preset: any) => {
        try {
            const text = JSON.stringify(current_preset, undefined, 7) || ''
            const textarea_element = document.getElementById(
                'taPresetSettings'
            ) as any
            textarea_element.value = text
            updateTextAreaHeight(textarea_element)
        } catch (e) {
            console.error(e)
        }
    }
)

function getPresetSettingsHtml() {
    //@ts-ignore
    const value_str = document.getElementById('taPresetSettings')!.value
    const value_json = JSON.parse(value_str)
    return value_json
}

function updateTextAreaHeight(textarea_element: any) {
    try {
        //update the height of the text area to fit the settings in

        const new_lines_count = general.countNewLines(textarea_element.value)
        let height = new_lines_count * 12 + 100
        height = Math.max(60, height)
        height = Math.min(500, height)
        textarea_element.style.height = height.toString() + 'px'
    } catch (e) {
        console.error(e)
    }
}

// function setPresetName(preset_name: string) {
//     //@ts-ignore
//     document.getElementById('tiPresetName')!.value = preset_name
// }

async function deletePreset() {
    try {
        store.data.custom_presets = await deleteCustomPresetSettings(
            preset_tab_store.data.selected_preset_name
        )
        preset_tab_store.data.selected_preset_name = ''
        preset_tab_store.data.new_preset = {}
    } catch (e) {
        console.error(e)
    }
}
function filterControlnetUnitData(controlnet_units_data: controlNetUnitData[]) {
    const filtered_data = controlnet_units_data.map((unit) => {
        const {
            input_image,
            mask,
            detect_map,
            model_list,
            module_list,
            ...rest
        } = unit
        return rest
    })
    return filtered_data
}

export function onNewPreset() {
    const plugin_preset = createGenerationPreset()
    preset_tab_store.data.new_preset = plugin_preset
    return plugin_preset
}

async function onSavePreset() {
    if (preset_tab_store.data.new_preset_name) {
        const preset_settings = getPresetSettingsHtml()
        const preset_name = preset_tab_store.data.new_preset_name.trim()
        store.data.custom_presets = await saveCustomPresetSettings(
            preset_name,
            preset_settings
        )

        console.log('store.data.custom_presets: ', store.data.custom_presets)
        preset_tab_store.data.selected_preset_name = preset_name
    }
}

@observer
class PresetTab extends React.Component<{}> {
    async componentDidMount() {
        // await populatePresetMenu()
        try {
            store.data.custom_presets = await getAllCustomPresetsSettings()

            // store.data.controlnet_native_presets = {
            //     ...controlnet_preset.ControlNetNativePresets,
            // }
        } catch (e) {
            console.error(e)
        }
    }
    renderTab() {
        return (
            <div>
                <sp-textfield
                    id="tiPresetName"
                    type="text"
                    placeholder={Locale('Preset Name')}
                    value={preset_tab_store.data.new_preset_name}
                    style={{ width: '160px' }}
                    onInput={(event: any) => {
                        preset_tab_store.data.new_preset_name =
                            event.target.value
                        // console.log(store.data.preset_name)
                    }}
                ></sp-textfield>
                <button
                    className="btnSquare"
                    id="btnGeneratePreset"
                    style={{ marginLeft: '5px' }}
                    onClick={() => {
                        onNewPreset()
                    }}
                >
                    {Locale('Generate Preset')}
                </button>
                <div style={{ marginTop: '3px' }}>
                    <button
                        className="btnSquare"
                        id="btnSavePreset"
                        style={{}}
                        onClick={async () => {
                            await onSavePreset()
                        }}
                    >
                        {Locale('Save Preset')}
                    </button>
                    <button
                        className="btnSquare"
                        id="btnDeletePreset"
                        style={{ marginLeft: '5px' }}
                        onClick={async () => {
                            await deletePreset()
                        }}
                    >
                        {Locale('Delete Preset')}
                    </button>
                </div>
                <div style={{ marginTop: '3px' }}>
                    <SpMenu
                        title={Locale('Custom Presets')}
                        items={Object.keys(store.data.custom_presets)}
                        label_item={Locale('Select a Custom Preset')}
                        selected_index={Object.keys(
                            store.data.custom_presets
                        ).indexOf(preset_tab_store.data.selected_preset_name)}
                        onChange={(id: any, value: any) => {
                            // console.log('onChange value: ', value)
                            // store.updateProperty('subject', value.item)
                            console.log('value:', value)
                            preset_tab_store.data.selected_preset_name =
                                value.item
                            preset_tab_store.data.new_preset_name = value.item
                            preset_tab_store.data.new_preset =
                                store.data.custom_presets[value.item]
                        }}
                    ></SpMenu>
                </div>
                <div>
                    <sp-label id="lPresetName">
                        {preset_tab_store.data.new_preset_name.trim()}
                    </sp-label>
                </div>
                <div>
                    <sp-textarea
                        id="taPresetSettings"
                        placeholder="{}"
                        value={
                            JSON.stringify(
                                preset_tab_store.data.new_preset,
                                undefined,
                                7
                            ) || ''
                        }
                        onChange={(event: any) => {
                            console.log('onChange:')
                            updateTextAreaHeight(event.target)
                        }}
                        onInput={(event: any) => {
                            console.log('onInput:')
                            updateTextAreaHeight(event.target)
                        }}
                    ></sp-textarea>
                </div>
            </div>
        )
    }
    render(): React.ReactNode {
        return this.renderTab()
    }
}

const gridContainerNode = document.getElementById('PresetTabContainer')!
const gridRoot = ReactDOM.createRoot(gridContainerNode)

gridRoot.render(
    //<React.StrictMode>
    <ErrorBoundary>
        <div style={{ border: '2px solid #6d6c6c', padding: '3px' }}>
            <Collapsible defaultIsOpen={false} label={Locale('Custom Preset')}>
                <PresetTab></PresetTab>
            </Collapsible>
        </div>
    </ErrorBoundary>
    //</React.StrictMode>
)
