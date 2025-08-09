import {cachedFactory, TypedProvider} from "@stemy/ngx-utils";

import {
    CrudDataCustomizerFunc,
    CrudUpdateResourcesFunc,
    IFormDataCustomizer,
    ISerializedDataCustomizer,
    IUpdateResources
} from "../common-types";

export function customizeFormData(...providers: TypedProvider<IFormDataCustomizer>[]): CrudDataCustomizerFunc {
    const factory = cachedFactory(providers);
    return async (data, injector, model, context) => {
        const customizers = factory(injector);
        for (const customizer of customizers) {
            await customizer.customizeFormData(data, model, context);
        }
        return data;
    }
}

export function customizeSerializedData(...providers: TypedProvider<ISerializedDataCustomizer>[]): CrudDataCustomizerFunc {
    const factory = cachedFactory(providers);
    return async (data, injector, model, context) => {
        const customizers = factory(injector);
        const target = {} as any;
        for (const customizer of customizers) {
            await customizer.customizeSerializedData(target, data, model, context);
        }
        return target;
    }
}

export function updateAdditionalResources(...providers: TypedProvider<IUpdateResources>[]): CrudUpdateResourcesFunc {
    const factory = cachedFactory(providers);
    return async (resources, injector, response, context) => {
        const customizers = factory(injector);
        for (const customizer of customizers) {
            await customizer.updateAdditionalResources(resources, response, context);
        }
    }
}
