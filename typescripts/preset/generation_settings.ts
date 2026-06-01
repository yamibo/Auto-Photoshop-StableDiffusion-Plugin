import { reaction, toJS } from 'mobx'
import { store as sd_tab_store, loadPresetSettings } from '../sd_tab/util'
import { store as multi_prompt_store } from '../multiTextarea'
import { getUnitsData } from '../controlnet/entry'
import { controlNetUnitData } from '../controlnet/store'

const LAST_GENERATION_SETTINGS_KEY = 'auto_ps_sd_last_generation_settings'
const LAST_GENERATION_SETTINGS_VERSION = 1

let autosaveDisposer: (() => void) | null = null

function copyJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(toJS(value)))
}

function filterControlnetUnitData(controlnet_units_data: controlNetUnitData[]) {
    return controlnet_units_data.map((unit) => {
        if (unit?.enabled === false) return {}

        const {
            input_image,
            mask,
            detect_map,
            model_list,
            module_list,
            ...rest
        } = unit
        return copyJson(rest)
    })
}

export function createGenerationPreset() {
    const prompt_data = copyJson(multi_prompt_store.data)
    const current_index = prompt_data.current_index ?? 0
    const sd_tab_preset = {
        ...copyJson(sd_tab_store.data),
        prompt: prompt_data.positivePrompts?.[current_index] ?? '',
        negative_prompt: prompt_data.negativePrompts?.[current_index] ?? '',
        prompts: prompt_data,
    }

    return {
        version: LAST_GENERATION_SETTINGS_VERSION,
        sd_tab_preset,
        controlnet_tab_preset: filterControlnetUnitData(
            getUnitsData() || []
        ),
    }
}

export function saveLastGenerationSettings() {
    try {
        localStorage.setItem(
            LAST_GENERATION_SETTINGS_KEY,
            JSON.stringify(createGenerationPreset())
        )
    } catch (e) {
        console.warn('saveLastGenerationSettings:', e)
    }
}

export function loadLastGenerationSettings() {
    try {
        const raw_settings = localStorage.getItem(LAST_GENERATION_SETTINGS_KEY)
        if (!raw_settings) return false

        loadPresetSettings(JSON.parse(raw_settings))
        return true
    } catch (e) {
        console.warn('loadLastGenerationSettings:', e)
        return false
    }
}

export function initLastGenerationSettingsAutosave() {
    if (autosaveDisposer) return

    autosaveDisposer = reaction(
        () =>
            JSON.stringify({
                sd_tab: toJS(sd_tab_store.data),
                prompts: toJS(multi_prompt_store.data),
                controlnet: filterControlnetUnitData(getUnitsData() || []),
            }),
        () => {
            saveLastGenerationSettings()
        },
        { delay: 500 }
    )
}
