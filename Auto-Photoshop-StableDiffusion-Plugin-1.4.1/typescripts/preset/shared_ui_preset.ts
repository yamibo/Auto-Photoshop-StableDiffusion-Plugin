import { AStore } from '../main/astore'
import { html_manip, io } from '../util/oldSystem'
import { PresetTypeEnum } from '../util/ts/enum'
// import { getNativeSDPresets } from '../util/ts/ui_ts'

const CUSTOM_PRESET_ORDER_KEY = 'auto_ps_sd_custom_preset_order'

export async function getLoadedPresets(ui_settings_obj: any) {
    let customPresets

    customPresets = await mapCustomPresetsToLoaders(ui_settings_obj)
    console.log('customPresets: ', customPresets)
    let loadedPresets = {
        // ...getNativeSDPresets(),
        ...customPresets,
    }
    return loadedPresets
}
export const store = new AStore({
    preset_name: '',
    custom_presets: [] as any,
    selected_preset_name: '',

    sd_presets: [],
    sd_native_presets: [],

    selected_sd_preset_name: '', // the selected sd preset in sd tab
    selected_sd_preset: {}, // the selected sd preset settings
})

export const preset_tab_store = new AStore({
    new_preset_name: '', //for the textfield field and label
    new_preset: {} as any, // settings of the current preset tab preset
    selected_preset_name: '', // name of the selected in the menu
    selected_preset: {}, //settings of the selected preset in the menu
})
export async function getCustomPresetEntries(preset_folder_name: string) {
    const custom_preset_entry = await io.IOFolder.getCustomPresetFolder(
        preset_folder_name
    )

    const custom_preset_entries = await io.IOJson.getJsonEntries(
        custom_preset_entry
    )

    return custom_preset_entries
}
export async function loadPresetSettingsFromFile(preset_file_name: string) {
    const custom_preset_entry = await io.IOFolder.getCustomPresetFolder(
        'custom_preset'
    )
    let preset_settings = {}
    try {
        preset_settings = await io.IOJson.loadJsonFromFile(
            custom_preset_entry,
            preset_file_name
        )
    } catch (e) {
        console.warn(e)
    }
    return preset_settings
}

export async function getAllCustomPresetsSettings() {
    const custom_preset_entries = await getCustomPresetEntries('custom_preset')
    let custom_presets: any = {}
    for (const entry of custom_preset_entries) {
        const preset_name: string = entry.name.split('.json')[0]
        let preset_settings = await loadPresetSettingsFromFile(entry.name)

        custom_presets[preset_name] = preset_settings
    }
    return sortCustomPresetsBySavedOrder(custom_presets)
}

function getSavedCustomPresetOrder(): string[] {
    try {
        const raw_order = localStorage.getItem(CUSTOM_PRESET_ORDER_KEY)
        const parsed_order = raw_order ? JSON.parse(raw_order) : []
        return Array.isArray(parsed_order) ? parsed_order : []
    } catch (e) {
        console.warn('getSavedCustomPresetOrder:', e)
        return []
    }
}

function saveCustomPresetOrder(order: string[]) {
    localStorage.setItem(CUSTOM_PRESET_ORDER_KEY, JSON.stringify(order))
}

function normalizeCustomPresetOrder(preset_names: string[]) {
    const saved_order = getSavedCustomPresetOrder()
    const preset_name_set = new Set(preset_names)
    const ordered_names = saved_order.filter((name) => preset_name_set.has(name))
    const unordered_names = preset_names
        .filter((name) => !ordered_names.includes(name))
        .sort((a, b) => a.localeCompare(b))

    return [...ordered_names, ...unordered_names]
}

export function sortCustomPresetsBySavedOrder(custom_presets: any) {
    const sorted_presets: any = {}
    const sorted_names = normalizeCustomPresetOrder(Object.keys(custom_presets))

    sorted_names.forEach((preset_name) => {
        sorted_presets[preset_name] = custom_presets[preset_name]
    })

    return sorted_presets
}

export async function saveCustomPresetSettings(
    preset_name: string,
    preset_settings: any
) {
    const trimmed_preset_name = preset_name.trim()
    if (!trimmed_preset_name) return getAllCustomPresetsSettings()
    const previous_presets = await getAllCustomPresetsSettings()
    const previous_order = normalizeCustomPresetOrder(
        Object.keys(previous_presets)
    )

    const custom_preset_entry = await io.IOFolder.getCustomPresetFolder(
        'custom_preset'
    )

    await io.IOJson.saveJsonToFileExe(
        preset_settings,
        custom_preset_entry,
        trimmed_preset_name + '.json'
    )

    const custom_presets = await getAllCustomPresetsSettings()
    const sorted_names = previous_order.filter((name) => custom_presets[name])

    if (!sorted_names.includes(trimmed_preset_name)) {
        sorted_names.push(trimmed_preset_name)
    }

    saveCustomPresetOrder(sorted_names)
    return sortCustomPresetsBySavedOrder(custom_presets)
}

export async function deleteCustomPresetSettings(preset_name: string) {
    const trimmed_preset_name = preset_name.trim()
    if (!trimmed_preset_name) return getAllCustomPresetsSettings()

    const custom_preset_entry = await io.IOFolder.getCustomPresetFolder(
        'custom_preset'
    )

    await io.IOJson.deleteFile(
        custom_preset_entry,
        trimmed_preset_name + '.json'
    )

    const custom_presets = await getAllCustomPresetsSettings()
    saveCustomPresetOrder(
        normalizeCustomPresetOrder(Object.keys(custom_presets)).filter(
            (name) => name !== trimmed_preset_name
        )
    )

    return sortCustomPresetsBySavedOrder(custom_presets)
}

export async function renameCustomPresetSettings(
    old_preset_name: string,
    new_preset_name: string
) {
    const old_name = old_preset_name.trim()
    const new_name = new_preset_name.trim()
    if (!old_name || !new_name) return getAllCustomPresetsSettings()

    const custom_presets = await getAllCustomPresetsSettings()
    const preset_settings = custom_presets[old_name]
    if (!preset_settings) return custom_presets
    const previous_order = normalizeCustomPresetOrder(Object.keys(custom_presets))

    if (old_name !== new_name) {
        const custom_preset_entry = await io.IOFolder.getCustomPresetFolder(
            'custom_preset'
        )

        await io.IOJson.saveJsonToFileExe(
            preset_settings,
            custom_preset_entry,
            new_name + '.json'
        )
        await io.IOJson.deleteFile(custom_preset_entry, old_name + '.json')
    }

    const updated_presets = await getAllCustomPresetsSettings()
    const updated_order = previous_order
        .map((name) => (name === old_name ? new_name : name))
        .filter((name) => updated_presets[name])

    saveCustomPresetOrder([...new Set(updated_order)])
    return sortCustomPresetsBySavedOrder(updated_presets)
}

export async function moveCustomPresetOrder(
    preset_name: string,
    direction: -1 | 1
) {
    const custom_presets = await getAllCustomPresetsSettings()
    const sorted_names = normalizeCustomPresetOrder(Object.keys(custom_presets))
    const current_index = sorted_names.indexOf(preset_name)
    const next_index = current_index + direction

    if (
        current_index < 0 ||
        next_index < 0 ||
        next_index >= sorted_names.length
    ) {
        return custom_presets
    }

    const next_name = sorted_names[next_index]
    sorted_names[next_index] = preset_name
    sorted_names[current_index] = next_name

    saveCustomPresetOrder(sorted_names)
    return sortCustomPresetsBySavedOrder(custom_presets)
}

const updatePresetMenuEvent = new CustomEvent('updatePresetMenuEvent', {
    detail: {},
    bubbles: true,
    cancelable: true,
    composed: false,
})

export function loadPreset(ui_settings: any, preset: any) {
    console.log('preset:', preset)
    ui_settings.autoFillInSettings(preset)
}
export function loadCustomPreset(
    ui_settings_obj: any,
    custom_preset_settings: any
) {
    loadPreset(ui_settings_obj, custom_preset_settings)
}
export async function mapCustomPresetsToLoaders(ui_settings_obj: any) {
    const name_to_settings_obj = await getAllCustomPresetsSettings()
    const preset_name_to_loader_obj: any = {}
    for (const [preset_name, preset_settings] of Object.entries(
        name_to_settings_obj
    )) {
        preset_name_to_loader_obj[preset_name] = () => {
            loadCustomPreset(ui_settings_obj, preset_settings)
        }
    }
    return preset_name_to_loader_obj
}

export function getCustomPresetsNames(custom_presets: any) {
    let presets_names: any = []
    if (custom_presets) {
        presets_names = Object.keys(custom_presets)
    }
    return presets_names
}

export function onLoadControlnetPreset() {}
export function onLoadSDPreset() {}

//sd preset = {preset_name: settings_json}
//sd_preset_loader(sd_preset)

//controlnet_preset = {preset_name: settings_json}

export { updatePresetMenuEvent }
