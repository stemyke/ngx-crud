import {Type} from "@angular/core";
import {cachedFactory, CachedProvider} from "@stemy/ngx-utils";
import {GetFormControlComponentType} from "@stemy/ngx-dynamic-form";

import {
    CrudDataCustomizerFunc,
    CrudUpdateResourcesFunc,
    IFormDataCustomizer,
    ISerializedDataCustomizer, IUpdateResources
} from "../common-types";

export function customizeFormData(...providers: CachedProvider<IFormDataCustomizer>[]): CrudDataCustomizerFunc {
    const factory = cachedFactory(providers);
    return async (data, injector, model, params, context) => {
        const customizers = factory(injector);
        for (const customizer of customizers) {
            await customizer.customizeFormData(data, model, params, context);
        }
        return data;
    }
}

export function customizeSerializedData(...providers: CachedProvider<ISerializedDataCustomizer>[]): CrudDataCustomizerFunc {
    const factory = cachedFactory(providers);
    return async (data, injector, model, params, context) => {
        const customizers = factory(injector);
        const target = {} as any;
        for (const customizer of customizers) {
            await customizer.customizeSerializedData(target, data, model, params, context);
        }
        return target;
    }
}

export function updateAdditionalResources(...providers: CachedProvider<IUpdateResources>[]): CrudUpdateResourcesFunc {
    const factory = cachedFactory(providers);
    return async (resources, injector, response, context) => {
        const customizers = factory(injector);
        for (const customizer of customizers) {
            await customizer.updateAdditionalResources(resources, response, context);
        }
    }
}
