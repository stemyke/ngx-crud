import {InjectionToken, Injector, Type} from "@angular/core";
import {ActivatedRouteSnapshot, Data, Params} from "@angular/router";
import {Subject} from "rxjs";
import {
    IAsyncMessage,
    IOpenApiSchemaProperty,
    IPaginationData,
    IResolveFactory,
    IRoute,
    ITableColumn,
    ITableDragEvent,
    RouteValidator
} from "@stemy/ngx-utils";
import {
    DynamicFormModel,
    FormModelCustomizer,
    GetFormControlComponentType,
    IDynamicFormEvent
} from "@stemy/ngx-dynamic-form";

// --- CRUD ---
export interface ICrudOutletState {
    dialog?: boolean;
    isActive?: boolean;
    data?: Data;
    params?: Params;
    snapshot?: ActivatedRouteSnapshot;
}

export interface ICrudTreeItem {
    snapshot: ActivatedRouteSnapshot;
    component: any;
}

export interface ICrudDataType {
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

export interface ICrudRouteContextBase {
    snapshot: ActivatedRouteSnapshot;
    params: Params;
    routeData: Data;
    page?: IPaginationData;
    entity?: Record<string, any>;
}

export interface ICrudRouteContext extends ICrudRouteContextBase {
    primaryRequest: CrudRouteRequest;
    [key: string]: any;
}

export interface ICrudRouteActionContext extends ICrudRouteContextBase {
    injector: Injector;
    context: ICrudRouteContext;
    endpoint: string;
    dataSource?: ICrudDataSource;
    onLeave?: (tree: ICrudTreeItem[]) => Promise<boolean>;
}

export interface ICrudListColumn extends ITableColumn {
    name: string;
    property?: IOpenApiSchemaProperty;
}

export type CrudButtonFunc = (context: ICrudRouteActionContext, item: any, button: string)
    => void | Promise<null | void | IAsyncMessage>;

export type CrudButtonCheckFunc<T = string> =
    (context: ICrudRouteActionContext, item: any, button: string) => boolean | T;

export type CrudButtonPropSetting<T = string> = boolean | T | CrudButtonCheckFunc<T>;

export type CrudButtonActionSetting = string | ((context: ICrudRouteActionContext, injector: Injector, item?: any) => string);

export type CrudDataCustomizerFunc = (data: any, injector: Injector, model: DynamicFormModel, context: ICrudRouteContext) => Promise<any>;

export type CrudColumnCustomizerFunc = (column: ICrudListColumn, injector: Injector, property: IOpenApiSchemaProperty, params: Params, context: ICrudRouteContext)
    => Promise<ICrudListColumn | ICrudListColumn[]>;

export type CrudUpdateResourcesFunc = (resources: any, injector: Injector, response: any, context: ICrudRouteContext) => Promise<void>;

export type CrudRouteLeaveFunc = (context: ICrudRouteActionContext, tree: ICrudTreeItem[]) => Promise<boolean>;

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

export type CrudDisplayMode = "routes" | "inline" | "dialog";

export type CrudRouteRequest = "list" | "add" | "edit";

export type CrudRouteMethod = "request" | "save" | "delete" | "import" | "export";

export type GetRequestPath = (
    context: ICrudRouteActionContext, reqType: CrudRouteRequest, method: CrudRouteMethod, importExport?: string
) => string;

export type GetBackPath = (context: ICrudRouteContext, endpoint: string) => string;

export type GetDataType = (context: ICrudRouteContext, injector: Injector) => string;

export type CrudDragHandler<R = boolean> = (ev: ITableDragEvent, context: ICrudRouteActionContext, injector: Injector) => R;

export interface ICrudRouteData {
    name?: string;
    icon?: string;
    defaultPath?: string;
    [key: string]: any;
}

export interface ICrudRouteOptionsBase {
    // Setting of crud display mode
    mode?: CrudDisplayMode;
    // Add button
    addButton?: CrudButtonPropSetting;
    addAction?: CrudButtonFunc;
    viewButton?: CrudButtonPropSetting;
    viewAction?: CrudButtonFunc;
    editButton?: CrudButtonPropSetting;
    editAction?: CrudButtonFunc;
    deleteButton?: CrudButtonPropSetting;
    deleteAction?: CrudButtonFunc;
    saveButton?: CrudButtonPropSetting;
    // Title of the action buttons list column
    actionsTitle?: string;
    // Custom actions to display for each item in list component
    customActions?: ICrudRouteCustomAction[];
    // Custom buttons to display under the table in list component
    customButtons?: ICrudRouteButton[];
    // Defines prefix for label translations
    labelPrefix?: string;
    // Defines if filtering with basic keywords in the list if enabled
    filter?: boolean;
    // Defines if querying for list fields are enabled in general
    query?: boolean;
    // Defines custom auth guards for the child routes
    guards?: Array<IResolveFactory | RouteValidator>;
    // A leave handler for any child rute
    onLeave?: CrudRouteLeaveFunc;
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
    // Displays an extra form based on the specified JSON schema in list component that helps in complex query
    queryForm?: boolean;
    // Sets if list metadata should be displayed
    displayMeta?: boolean;
    // Drag start handler in list component
    onDragStart?: CrudDragHandler;
    // Drag enter handler in list component
    onDragEnter?: CrudDragHandler;
    // Drop handler in list component
    onDrop?: CrudDragHandler<void>;
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
    outlet?: string;
    listChildren?: IRoute[];
    formChildren?: IRoute[];
}

export interface ICrudRouteSettings extends Required<ICrudRouteOptionsBase> {
    getDataType: GetDataType;
    primaryRequest: CrudRouteRequest;
    endpoint: string;
    id: string;
}

export interface ICrudComponent {
    readonly context: ICrudRouteContext;
    readonly settings: ICrudRouteSettings;
    getActionContext(): ICrudRouteActionContext;
}

export interface ICrudList extends ICrudComponent {
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

// --- Module Configuration ---

export const FILTER_PARAM_NAME = new InjectionToken<string>("filter-param-name");

export const QUERY_PARAM_NAME = new InjectionToken<string>("query-param-name");

export const COMPONENT_TYPES = new InjectionToken<ICrudComponentTypes>("crud-component-types");

export const ACTION_ICONS = new InjectionToken<ICrudComponentTypes>("crud-action-icons");

export const ACTIONS_COLUMN_TITLE = new InjectionToken<string>("actions-column-title");

export interface ICrudModuleConfig {
    filterParamName?: string;
    queryParamName?: string;
    componentTypes?: ICrudComponentTypes;
    actionIcons?: CrudActionIcons;
    // Default title of the actions column in list component
    actionsTitle?: string;
}
