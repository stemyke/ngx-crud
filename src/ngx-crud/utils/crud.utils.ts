import {Injector, Type} from "@angular/core";
import {AuthGuard, IRoute, StateService} from "@stemy/ngx-utils";
import {DynamicFormControlComponent} from "@stemy/ngx-dynamic-form";

import {
    CrudRouteRequest,
    ICrudRequestType, ICrudRouteButtonContext,
    ICrudRouteOptions,
    ICrudRouteSettings
} from "../common-types";
import {getRequestPath} from "./route.utils";
import {ContextResolverService} from "../services/context-resolver.service";
import {CrudListComponent} from "../components/crud-list/crud-list.component";
import {CrudFormComponent} from "../components/crud-form/crud-form.component";
import {CrudWrapperComponent} from "../components/base/crud-wrapper.component";

export async function defaultCrudAction(injector: Injector, button: string, context: ICrudRouteButtonContext, item?: any) {
    const state = injector.get(StateService);
    const path = !item ? [button] : [button, item._id];
    let snapshot = state.snapshot;
    while (snapshot) {
        path.unshift(...snapshot.url.map(s => s.path));
        snapshot = snapshot.parent;
    }
    await state.navigate(path);
}

export async function customizeData(data?: any): Promise<any> {
    return data;
}

export function noopCb(): any {}

function getNullFormComponent(): Type<DynamicFormControlComponent> {
    return null;
}

export function createCrudSettings(id: string, endpoint: string, requestType: string | ICrudRequestType, primaryRequest: CrudRouteRequest = "list", options?: ICrudRouteOptions): ICrudRouteSettings {
    return {
        id,
        endpoint,
        requestType,
        primaryRequest,
        addButton: options?.addButton !== false,
        addAction: options?.addAction || defaultCrudAction,
        viewButton: options?.viewButton || false,
        viewAction: options?.viewAction || defaultCrudAction,
        editButton: options?.editButton || options?.editButton !== false,
        editAction: options?.editAction || defaultCrudAction,
        deleteButton: options?.deleteButton || options?.deleteButton !== false,
        deleteAction: options?.deleteAction,
        saveButton: options?.saveButton || options?.saveButton !== false,
        customActions: options?.customActions || [],
        customButtons: options?.customButtons || [],
        labelPrefix: options?.labelPrefix || "",
        filter: options?.filter !== false,
        guards: options?.guards || [],
        importExports: primaryRequest == "edit" ? (options?.importExports || []) : [],
        loadContext: options?.loadContext || customizeData,
        formValueChange: options?.formValueChange || noopCb,
        getFormComponent: options?.getFormComponent || getNullFormComponent,
        rowAction: options?.rowAction || null,
        formContext: options?.formContext || null,
        getRequestPath: options?.getRequestPath || getRequestPath,
        customizeListColumn: options?.customizeListColumn || customizeData,
        customizeFormModel: options?.customizeFormModel,
        customizeFormData: options?.customizeFormData || customizeData,
        customizeSerializedData: options?.customizeSerializedData || customizeData,
        updateAdditionalResources: options?.updateAdditionalResources || customizeData,
        listDependencies: options?.listDependencies || [],
        itemsListed: options?.itemsListed || customizeData,
        itemsPerPage: options?.itemsPerPage || 12,
        filterForm: options?.filterForm || false,
        displayMeta: options?.displayMeta || false,
    };
}

export function createCrudRoute(id: string, path: string, component: Type<any>, settings: ICrudRouteSettings, name?: string, icon?: string, defaultPath?: string): IRoute {
    return {
        path,
        component,
        canActivate: [AuthGuard],
        data: {
            id,
            name,
            icon,
            defaultPath,
            guards: settings.guards || [],
            settings
        },
        resolve: {
            context: ContextResolverService
        }
    };
}

export function createCrudRoutes(id: string, endpoint: string, requestType: string | ICrudRequestType, options?: ICrudRouteOptions): IRoute[] {
    const params = Object.entries(options?.defaultParams || {});
    let defaultPath = `${endpoint}`;
    params.forEach(([key, value]) => {
        defaultPath = defaultPath.replace(`:${key}`, `${value}`);
    });
    return [
        createCrudRoute(
            id,
            endpoint,
            options?.listComponent || CrudWrapperComponent,
            createCrudSettings(id, endpoint, requestType, "list", options),
            options?.menu !== false && !defaultPath.includes(":") ? `title.${id}` : null,
            options?.icon,
            defaultPath
        ),
        createCrudRoute(
            `add-${id}`,
            `${endpoint}/add`,
            options?.addComponent || CrudWrapperComponent,
            createCrudSettings(id, endpoint, requestType, options?.addRequest || "add", options)
        ),
        createCrudRoute(
            `edit-${id}`,
            `${endpoint}/edit/:id`,
            options?.editComponent || CrudWrapperComponent,
            createCrudSettings(id, endpoint, requestType, options?.editRequest || "edit", options)
        )
    ];
}
