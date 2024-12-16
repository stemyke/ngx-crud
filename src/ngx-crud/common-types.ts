import {Data, Params, UrlSegment} from "@angular/router";
import {
    IAsyncMessage,
    IOpenApiSchemaProperty,
    IPaginationData,
    IResolveFactory,
    ITableColumn,
    RouteValidator
} from "@stemy/ngx-utils";
import {
    DynamicFormModel,
    FormModelCustomizer,
    GetFormControlComponentType,
    IDynamicFormEvent
} from "@stemy/ngx-dynamic-form";
import {InjectionToken, Injector, Type} from "@angular/core";
import {Subject} from "rxjs";
import {ITableDragEvent} from "@stemy/ngx-utils/ngx-utils/common-types";

// --- CRUD ---
export interface ICrudRequestType {
    list?: string;
    add?: string;
    edit?: string;
    prefixed?: string;
}

export interface ICrudDataSource {
    loadData: (page: number, itemsPerPage: number) => Promise<IPaginationData>;
    refresh(time?: number): void;
    setFilter(filter: string): void;
    setOrder(column: string): void;
    updateQuery(col: string, value: string): void;
}

export interface ICrudRouteContext {
    params: Params;
    data: Data;
    dataSource?: ICrudDataSource;
    page?: IPaginationData;
    entity?: Record<string, any>;
    [key: string]: any;
}

export interface ICrudRouteButtonContext {
    injector: Injector;
    context: ICrudRouteContext;
    params: Params;
    endpoint: string;
    dataSource?: ICrudDataSource;
    data?: any;
}

export interface ICrudListColumn extends ITableColumn {
    name: string;
    property?: IOpenApiSchemaProperty;
}

export type CrudButtonFunc = (injector: Injector, button: string, context: ICrudRouteButtonContext, item?: any)
    => void | Promise<null | void | IAsyncMessage>;

export type CrudButtonCheckFunc<T = string> =
    (context: ICrudRouteButtonContext, button: string, item?: any) => boolean | T;

export type CrudButtonPropSetting<T = string> = boolean | T | CrudButtonCheckFunc<T>;

export type CrudButtonActionSetting = string | ((context: ICrudRouteButtonContext, injector: Injector, item?: any) => string);

export type CrudDataCustomizerFunc = (data: any, injector: Injector, model: DynamicFormModel, context: ICrudRouteContext) => Promise<any>;

export type CrudColumnCustomizerFunc = (column: ICrudListColumn, injector: Injector, property: IOpenApiSchemaProperty, params: Params, context: ICrudRouteContext)
    => Promise<ICrudListColumn | ICrudListColumn[]>;

export type CrudUpdateResourcesFunc = (resources: any, injector: Injector, response: any, context: ICrudRouteContext) => Promise<void>;

export type CrudButtonStatus = "primary" | "info" | "success" | "warning" | "danger" | "default";

export interface ICrudRouteButton<IT = CrudButtonPropSetting> {
    button: string;
    function: CrudButtonFunc;
    hidden?: boolean | CrudButtonCheckFunc<boolean>;
    icon?: IT;
}

export interface ICrudRouteCustomAction {
    id: string;
    button: CrudButtonPropSetting;
    action?: CrudButtonFunc;
    status?: CrudButtonStatus | CrudButtonCheckFunc<CrudButtonStatus>;
    title?: string;
    icon?: string;
}

export type CrudRouteRequest = "list" | "add" | "edit";

export type CrudRouteMethod = "request" | "save" | "delete" | "import" | "export";

export type GetRequestPath = (
    endpoint: string, item: Record<string, any>, reqType: CrudRouteRequest, method: CrudRouteMethod, injector: Injector, importExport?: string
) => Promise<string>;

export type GetBackPath = (
    endpoint: string, reqType: CrudRouteRequest, context: ICrudRouteContext, injector: Injector
) => Promise<Array<string | UrlSegment>>;

export type CrudDragHandler = (ev: ITableDragEvent, context: ICrudRouteContext, injector: Injector) => boolean;

export interface ICrudRouteOptionsBase {
    addButton?: CrudButtonPropSetting;
    addAction?: CrudButtonFunc;
    viewButton?: CrudButtonPropSetting;
    viewAction?: CrudButtonFunc;
    editButton?: CrudButtonPropSetting;
    editAction?: CrudButtonFunc;
    deleteButton?: CrudButtonPropSetting;
    deleteAction?: CrudButtonFunc;
    saveButton?: CrudButtonPropSetting;
    // Custom actions to display for each item in list component
    customActions?: ICrudRouteCustomAction[];
    // Custom buttons to display under the table in list component
    customButtons?: ICrudRouteButton[];
    // Defines prefix for label translations
    labelPrefix?: string;
    // Defines if filtering for list fields are enabled in general
    filter?: boolean;
    // Defines custom auth guards for the child routes
    guards?: Array<IResolveFactory | RouteValidator>;
    // Defines small forms for import/export partial data with the specified identifiers
    importExports?: string[];
    // Loads an additional context for the route
    loadContext?: (context: ICrudRouteContext, injector: Injector) => Promise<ICrudRouteContext>;
    // Called when form value changes
    formValueChange?: (ev: IDynamicFormEvent, injector: Injector) => void;
    // This can be used to define custom components for each model
    getFormComponent?: GetFormControlComponentType;
    // Run this action when the whole row is clicked
    rowAction?: CrudButtonActionSetting;
    // Additional context to be sent for admin user when saving an entity
    formContext?: any;
    // Get the request path for the specified request type
    getRequestPath?: GetRequestPath;
    // Get the route back path after editing/adding an entity
    getBackPath?: GetBackPath;
    // Customize list columns, if it returns null/undefined it will be removed
    customizeListColumn?: CrudColumnCustomizerFunc;
    // Customize the form model generated based on swagger schema
    customizeFormModel?: FormModelCustomizer;
    // Customize the DTO response to fit the customized form model
    customizeFormData?: CrudDataCustomizerFunc;
    // Customize the form"s serialized data to fit the DTO
    customizeSerializedData?: CrudDataCustomizerFunc;
    // Here with an already created entity you can update additional resources attached to it
    updateAdditionalResources?: CrudUpdateResourcesFunc;
    // Dependency subjects to be checked if we should refresh the list
    listDependencies?: Subject<any>[] | ((injector: Injector) => Subject<any>[]);
    // Listener when list data is arrived
    itemsListed?: (context: ICrudRouteContext, injector: Injector) => Promise<void>;
    // How many items should be listed
    itemsPerPage?: number;
    // Displays an extra form based on the specified JSON schema in list component
    filterForm?: boolean;
    // Sets if list metadata should be displayed
    displayMeta?: boolean;
    // Drag start handler in list component
    onDragStart?: CrudDragHandler;
    // Drag enter handler in list component
    onDragEnter?: CrudDragHandler;
    // Drop handler in list component
    onDrop?: CrudDragHandler;
}

export interface ICrudRouteOptions extends ICrudRouteOptionsBase {
    listComponent?: Type<any>;
    addComponent?: Type<any>;
    addRequest?: CrudRouteRequest;
    editComponent?: Type<any>;
    editRequest?: CrudRouteRequest;
    menu?: boolean;
    icon?: string;
    defaultParams?: Record<string, any>;
}

export interface ICrudRouteSettings extends Required<ICrudRouteOptionsBase> {
    requestType: string | ICrudRequestType;
    primaryRequest: CrudRouteRequest;
    endpoint: string;
    id: string;
}

export interface ICrudList {
    readonly settings: ICrudRouteSettings;
    callAction(action: string, item: any): Promise<IAsyncMessage>;
}

// --- CRUD customizers ---

export interface IFormDataCustomizer {
    customizeFormData(
        data: any,
        model: DynamicFormModel,
        context: ICrudRouteContext
    ): Promise<void>;
}

export interface ISerializedDataCustomizer {
    customizeSerializedData(
        target: any,
        data: any,
        model: DynamicFormModel,
        context: ICrudRouteContext
    ): Promise<void>;
}

export interface IUpdateResources {
    updateAdditionalResources(
        resources: any,
        response: any,
        context: ICrudRouteContext
    ): Promise<void>;
}

// --- Components configuration ---

export interface ICrudComponentTypes {
    list?: Type<any>;
    add?: Type<any>;
    edit?: Type<any>;
    cell?: Type<any>;
}

export type CrudActionIcons = Record<string, string>;

export const COMPONENT_TYPES = new InjectionToken<ICrudComponentTypes>("crud-component-types");

export const ACTION_ICONS = new InjectionToken<ICrudComponentTypes>("crud-action-icons");

// --- Module Configuration ---

export const FILTER_QUERY_NAME = new InjectionToken<string>("filter-query-name");

export interface ICrudModuleConfig {
    filterName?: string;
    componentTypes?: ICrudComponentTypes;
    actionIcons?: CrudActionIcons;
}
