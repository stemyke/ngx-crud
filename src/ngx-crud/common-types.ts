import {InjectionToken, Injector, TemplateRef, Type} from "@angular/core";
import {ActivatedRouteSnapshot, Data, Params, UrlTree} from "@angular/router";
import {Subject} from "rxjs";
import {
    ButtonType,
    IAsyncMessage,
    OpenApiSchemaProperty,
    HttpRequestOptions,
    HttpRequestQuery,
    IPaginationData,
    IResolveFactory,
    IRoute,
    ITableColumn,
    ITableDragEvent,
    RouteValidator,
    TabOption
} from "@stemy/ngx-utils";
import {FormFieldConfig, FormFieldCustomizer, FormFieldLabelCustomizer,} from "@stemy/ngx-dynamic-form";

// --- CRUD ---
export interface CrudRouteLink extends TabOption {
    path?: UrlTree;
    data?: Data;
}

export interface CrudOutletState {
    dialog?: boolean;
    isActive?: boolean;
    data?: Data;
    params?: Params;
    snapshot?: ActivatedRouteSnapshot;
    page?: string;
    links?: CrudRouteLink[];
}

export interface CrudTreeItem {
    snapshot: ActivatedRouteSnapshot;
    component: any;
}

export interface CrudDataType {
    list?: string;
    add?: string;
    edit?: string;
    view?: string;
    prefixed?: string;
}

export interface CrudDataSource {
    loadData: (page: number, itemsPerPage: number) => Promise<IPaginationData>;
    refresh(time?: number): void;
    setFilter(filter: string): void;
    setSorting(column: string): void;
    setQueryValue(col: string, value: string): void;
}

export interface CrudRouteContextBase {
    snapshot: ActivatedRouteSnapshot;
    params: Params;
    routeData: Data;
    page?: IPaginationData;
    entity?: Record<string, any>;
}

export interface ICrudRouteContext extends CrudRouteContextBase {
    primaryRequest: CrudRouteRequest;
    [key: string]: any;
}

export interface ICrudRouteActionContext extends CrudRouteContextBase {
    injector: Injector;
    context: ICrudRouteContext;
    endpoint: string;
    dataSource?: CrudDataSource;
    onLeave?: (tree: CrudTreeItem[]) => Promise<boolean>;
}

export interface ICrudListColumn extends ITableColumn {
    name: string;
    property?: OpenApiSchemaProperty;
}

export type CrudButtonFunc = (context: ICrudRouteActionContext, item: any, button: string)
    => void | Promise<null | void | IAsyncMessage>;

export type CrudButtonCheckFunc<T = string> =
    (context: ICrudRouteActionContext, item: any, button: string) => boolean | T;

export type CrudButtonPropSetting<T = string> = boolean | T | CrudButtonCheckFunc<T>;

export type CrudButtonActionSetting =
    string
    | ((context: ICrudRouteActionContext, injector: Injector, item?: any) => string);

export type CrudDataCustomizerFunc = (data: any, injector: Injector, field: FormFieldConfig, context: ICrudRouteContext) => Promise<any>;

export type CrudColumnCustomizerFunc = (column: ICrudListColumn, injector: Injector, property: OpenApiSchemaProperty, params: Params, context: ICrudRouteContext)
    => Promise<ICrudListColumn | ICrudListColumn[]>;

export type CrudUpdateResourcesFunc = (resources: any, injector: Injector, response: any, context: ICrudRouteContext) => Promise<void>;

export type CrudRouteLeaveFunc = (context: ICrudRouteActionContext, tree: CrudTreeItem[]) => Promise<boolean>;

export type CrudButtonStatus = "primary" | "info" | "success" | "warning" | "danger" | "default";

export interface ICrudRouteButton<IT = CrudButtonPropSetting> {
    button: string;
    function: CrudButtonFunc;
    hidden?: boolean | CrudButtonCheckFunc<boolean>;
    icon?: IT;
    type?: ButtonType;
    testId?: string;
}

export interface ICrudRouteAction {
    id: string;
    button: CrudButtonPropSetting;
    action?: CrudButtonFunc;
    status?: CrudButtonStatus | CrudButtonCheckFunc<CrudButtonStatus>;
    title?: string;
}

export type CrudDisplayMode = "routes" | "inline" | "dialog";

export type CrudRouteRequest = "list" | "add" | "edit";

export type CrudRouteMethod = "request" | "save" | "delete" | "import" | "export";

export interface CrudRequestPath {
    url: string;
    options?: HttpRequestOptions;
    params?: HttpRequestQuery;
}

export type GetRequestPath = (
    context: ICrudRouteActionContext, reqType: CrudRouteRequest, method: CrudRouteMethod, importExport?: string
) => string | CrudRequestPath;

export type GetBackPath = (context: ICrudRouteActionContext) => string;

export type GetDataType = (context: ICrudRouteContext, injector: Injector) => string;

export type CrudDragHandler<R = boolean> = (ev: ITableDragEvent, context: ICrudRouteActionContext, injector: Injector) => R;

export interface ICrudRouteData {
    name?: string;
    icon?: string;
    defaultPath?: string;

    [key: string]: any;
}

export interface ICrudRouteParams {
    /**
     * Setting of crud display mode
     */
    mode?: CrudDisplayMode;
    /**
     * Whether to display tab buttons for child route components
     */
    useTabs?: boolean;
    /**
     * Whether to hide the main component when a child route is activated
     */
    hideMain?: boolean;
    /**
     * Add button
     */
    addButton?: CrudButtonPropSetting;
    addAction?: CrudButtonFunc;
    viewButton?: CrudButtonPropSetting;
    viewAction?: CrudButtonFunc;
    editButton?: CrudButtonPropSetting;
    editAction?: CrudButtonFunc;
    deleteButton?: CrudButtonPropSetting;
    deleteAction?: CrudButtonFunc;
    saveButton?: CrudButtonPropSetting;
    /**
     * Title of the action buttons list column
     */
    actionsTitle?: string;
    /**
     * Custom actions to display for each item in list component
     */
    customActions?: ICrudRouteAction[];
    /**
     * Custom buttons to display under the table in list component
     */
    customButtons?: ICrudRouteButton[];
    /**
     * Defines prefix for label translations
     */
    labelPrefix?: string;
    /**
     * Defines if filtering with basic keywords in the list if enabled
     */
    filter?: boolean;
    /**
     * Defines if querying for list fields are enabled in general
     */
    query?: boolean;
    /**
     * Defines custom auth guards for the child routes
     */
    guards?: Array<IResolveFactory | RouteValidator>;
    /**
     * A leave handler for any child rute
     */
    onLeave?: CrudRouteLeaveFunc;
    /**
     * Defines small forms for import/export partial data with the specified identifiers
     */
    importExports?: string[];
    /**
     * Loads an additional context for the route
     */
    loadContext?: (context: ICrudRouteContext, injector: Injector) => Promise<ICrudRouteContext>;
    /**
     * Run this action when the whole row is clicked
     */
    rowAction?: CrudButtonActionSetting;
    /**
     * Additional context to be sent for admin user when saving an entity
     */
    formContext?: any;
    /**
     * Get the request path for the specified request type
     */
    getRequestPath?: GetRequestPath;
    /**
     * Get the route back path after editing/adding an entity
     */
    getBackPath?: GetBackPath;
    /**
     * Customize list columns, if it returns null/undefined it will be removed
     */
    customizeListColumn?: CrudColumnCustomizerFunc;
    /**
     * Customize the form fields labels generated based on swagger schema
     */
    customizeFormLabel?: FormFieldLabelCustomizer;
    /**
     * Customize the form fields generated based on swagger schema
     */
    customizeFormField?: FormFieldCustomizer;
    /**
     * Customize the DTO response to fit the customized form model
     */
    customizeFormData?: CrudDataCustomizerFunc;
    /**
     * Customize the forms serialized data to fit the DTO
     */
    customizeSerializedData?: CrudDataCustomizerFunc;
    /**
     * Here with an already created entity you can update additional resources attached to it
     */
    updateAdditionalResources?: CrudUpdateResourcesFunc;
    /**
     * Dependency subjects to be checked if we should refresh the list
     */
    listDependencies?: Subject<any>[] | ((injector: Injector) => Subject<any>[]);
    /**
     * Listener when list data is arrived
     */
    itemsListed?: (context: ICrudRouteContext, injector: Injector) => Promise<void>;
    /**
     * How many items should be listed
     */
    itemsPerPage?: number;
    /**
     * Default order column
     */
    orderBy?: string;
    /**
     * Default order direction
     */
    orderDescending?: boolean;
    /**
     * Displays an extra form based on the specified JSON schema in list component that helps in complex query
     */
    queryForm?: boolean;
    /**
     * Sets if list metadata should be displayed
     */
    displayMeta?: boolean;
    /**
     * Drag start handler in list component
     */
    onDragStart?: CrudDragHandler;
    /**
     * Drag enter handler in list component
     */
    onDragEnter?: CrudDragHandler;
    /**
     * Drop handler in list component
     */
    onDrop?: CrudDragHandler<void>;
}

export interface ICrudRouteOptions extends ICrudRouteParams {
    listComponent?: Type<any>;
    addComponent?: Type<any>;
    addRequest?: CrudRouteRequest;
    editComponent?: Type<any>;
    editRequest?: CrudRouteRequest;
    viewComponent?: Type<any>;
    viewRequest?: CrudRouteRequest;
    menu?: boolean;
    icon?: string;
    defaultParams?: Record<string, any>;
    outlet?: string;
    listChildren?: IRoute[];
    addChildren?: IRoute[];
    editChildren?: IRoute[];
    viewChildren?: IRoute[];
    formChildren?: IRoute[];
}

export interface ICrudRouteSettings extends Required<ICrudRouteParams> {
    id: string;
    endpoint: string;
    primaryRequest: CrudRouteRequest;
    getDataType: GetDataType;
    component: Type<any>;
}

export interface ICrudComponent {
    readonly context: ICrudRouteContext;
    readonly settings: ICrudRouteSettings;
    readonly header: TemplateRef<any>;
    readonly content: TemplateRef<any>;
    readonly footer: TemplateRef<any>;

    getActionContext(): ICrudRouteActionContext;
}

export interface ICrudList extends ICrudComponent {
    callAction(action: string, item: any): Promise<IAsyncMessage>;
}

// --- CRUD customizers ---

export interface IFormDataCustomizer {
    customizeFormData(
        data: any,
        field: FormFieldConfig,
        context: ICrudRouteContext
    ): Promise<void>;
}

export interface ISerializedDataCustomizer {
    customizeSerializedData(
        target: any,
        data: any,
        field: FormFieldConfig,
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
    view?: Type<any>;
    cell?: Type<any>;
    container?: Type<any>;
}

// --- Module Configuration ---

export const FILTER_PARAM_NAME = new InjectionToken<string>("filter-param-name");

export const QUERY_PARAM_NAME = new InjectionToken<string>("query-param-name");

export const COMPONENT_TYPES = new InjectionToken<ICrudComponentTypes>("crud-component-types");

export const ACTIONS_COLUMN_TITLE = new InjectionToken<string>("actions-column-title");

export interface ICrudModuleConfig {
    filterParamName?: string;
    queryParamName?: string;
    componentTypes?: ICrudComponentTypes;
    /**
     * Default title of the actions column in list component
     */
    actionsTitle?: string;
}
