import {Injector, Type} from "@angular/core";
import {AuthGuard, IRoute, ObjectUtils, StateService} from "@stemy/ngx-utils";
import {DynamicFormControlComponent} from "@stemy/ngx-dynamic-form";

import {
    CrudButtonPropSetting,
    CrudRouteRequest,
    ICrudRequestType,
    ICrudRouteActionContext,
    ICrudRouteOptions,
    ICrudRouteSettings
} from "../common-types";
import {getNavigateBackPath, getRequestPath} from "./route.utils";
import {ContextResolverService} from "../services/context-resolver.service";
import {CrudWrapperComponent} from "../components/base/crud-wrapper.component";

export async function defaultCrudAction(injector: Injector, button: string, _c: ICrudRouteActionContext, item?: any) {
    const state = injector.get(StateService);
    const path = !item ? [button] : [button, item._id];
    let snapshot = state.snapshot;
    while (snapshot) {
        path.unshift(...snapshot.url.map(s => s.path));
        snapshot = snapshot.parent;
    }
    await state.navigate(path);
}

async function returnCb(data?: any): Promise<any> {
    return data;
}

function noopCb(): any {}

function dragCb(): boolean {
    return false;
}

function getNullFormComponent(): Type<DynamicFormControlComponent> {
    return null;
}

export function selectBtnProp<T extends string>(prop: CrudButtonPropSetting<T>, ctx: ICrudRouteActionContext, action: string, value: T, item?: any): T {
    prop = ObjectUtils.isFunction(prop) ? prop(ctx, action, item) : prop;
    return ObjectUtils.isString(prop) && prop
        ? prop as T : prop !== false ? value : null;
}

export function createCrudSettings(id: string, endpoint: string, requestType: string | ICrudRequestType, primaryRequest: CrudRouteRequest = "list", options?: ICrudRouteOptions): ICrudRouteSettings {
    return {
        id,
        endpoint,
        requestType,
        primaryRequest,
        addButton: options?.addButton,
        addAction: options?.addAction || defaultCrudAction,
        viewButton: options?.viewButton || false,
        viewAction: options?.viewAction || defaultCrudAction,
        editButton: options?.editButton,
        editAction: options?.editAction || defaultCrudAction,
        deleteButton: options?.deleteButton,
        deleteAction: options?.deleteAction,
        saveButton: options?.saveButton,
        customActions: options?.customActions || [],
        customButtons: options?.customButtons || [],
        labelPrefix: options?.labelPrefix || "",
        filter: options?.filter !== false,
        guards: options?.guards || [],
        importExports: primaryRequest == "edit" ? (options?.importExports || []) : [],
        loadContext: options?.loadContext || returnCb,
        formValueChange: options?.formValueChange || noopCb,
        getFormComponent: options?.getFormComponent || getNullFormComponent,
        rowAction: options?.rowAction || null,
        formContext: options?.formContext || null,
        getRequestPath: options?.getRequestPath || getRequestPath,
        getBackPath: options?.getBackPath || getNavigateBackPath,
        customizeListColumn: options?.customizeListColumn || returnCb,
        customizeFormModel: options?.customizeFormModel,
        customizeFormData: options?.customizeFormData || returnCb,
        customizeSerializedData: options?.customizeSerializedData || returnCb,
        updateAdditionalResources: options?.updateAdditionalResources || noopCb,
        listDependencies: options?.listDependencies || [],
        itemsListed: options?.itemsListed || noopCb,
        itemsPerPage: options?.itemsPerPage || 12,
        filterForm: options?.filterForm || false,
        displayMeta: options?.displayMeta || false,
        onDragStart: options?.onDragStart || dragCb,
        onDragEnter: options?.onDragEnter || dragCb,
        onDrop: options?.onDrop || dragCb,
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
            options?.menu !== false && !defaultPath.includes(":") ? `menu.${id}` : null,
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
