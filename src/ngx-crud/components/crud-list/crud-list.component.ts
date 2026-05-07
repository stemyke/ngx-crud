import {Component, OnChanges, ViewChild, ViewEncapsulation} from "@angular/core";
import {
    DynamicTableComponent,
    DynamicTableDragHandler, HttpRequestQuery,
    IAsyncMessage,
    IconMap,
    IPaginationData,
    ITableColumns,
    ITimer,
    ObjectUtils,
    ObservableUtils,
    OpenApiSchema,
    StringUtils,
    TableDataItems,
    TableDataLoader,
    TimerUtils
} from "@stemy/ngx-utils";
import {FormFieldConfig, FormSerializeResult} from "@stemy/ngx-dynamic-form";
import {CrudButtonActionSetting, ICrudList, ICrudRouteActionContext, ICrudRouteSettings} from "../../common-types"
import {createTableColumnsForSchema, defaultCrudPath, selectBtnProp} from "../../utils/crud.utils";
import {BaseCrudComponent} from "../base/base-crud.component";
import {FormFieldChangeEvent} from "@stemy/ngx-dynamic-form/ngx-dynamic-form/common-types";

const defaultIcons: IconMap = {
    view: "eye",
    edit: "pencil",
    delete: "trash"
};

const actionsWithPath = ["view", "edit"];

@Component({
    standalone: false,
    selector: "crud-list",
    templateUrl: "./crud-list.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudListComponent extends BaseCrudComponent implements OnChanges, ICrudList {

    queryFields: FormFieldConfig[];
    queryData: Record<string, any>;

    dataLoader: TableDataLoader;
    dataItems: TableDataItems;

    tableColumns: ITableColumns;
    data: IPaginationData;
    dragStartFn: DynamicTableDragHandler;
    dragEnterFn: DynamicTableDragHandler;
    dropFn: DynamicTableDragHandler<void>;

    addButton: string;
    selectedItem: any;

    protected schema: OpenApiSchema;
    protected filterParams: FormSerializeResult;
    protected updateSettings: ITimer;

    @ViewChild("table")
    protected table: DynamicTableComponent;

    ngOnInit(): void {
        super.ngOnInit();
        this.data = {
            total: 0,
            items: [],
            meta: {}
        };
        this.dragStartFn = !this.settings.onDragStart ? null : (ev) => {
            return this.settings.onDragStart(ev, this.getActionContext(), this.injector);
        };
        this.dragEnterFn = !this.settings.onDragEnter ? null : (ev) => {
            return this.settings.onDragEnter(ev, this.getActionContext(), this.injector);
        };
        this.dropFn = !this.settings.onDrop ? null : (ev) => {
            this.settings.onDrop(ev, this.getActionContext(), this.injector);
        };
        const dependencies = this.settings.listDependencies;
        const subjects = ObjectUtils.isArray(dependencies)
            ? dependencies
            : (ObjectUtils.isFunction(dependencies) ? dependencies(this.injector) : []);
        this.filterParams = {};
        this.updateSettings = TimerUtils.createTimeout(async () => {
            const settings = this.settings;
            if (!settings) return;
            // --- Update schema ---
            const requestType = settings.getDataType(this.context, this.injector);
            this.schema = await this.openApi.getSchema(requestType);
            if (!this.schema) {
                console.log(`Schema by name "${requestType}" not found`);
                return;
            }
            // --- Update query models ---
            const queryFields = settings.listQuery
                ? await this.forms.getFormFieldsForSchema(`Query${requestType}`, {
                    labelPrefix: settings.labelPrefix || settings.id,
                    labelCustomizer: settings.customizeFormLabel,
                    testId: settings.id,
                    context: this.context,
                    fieldCustomizer: settings.customizeFormField
                })
                : [];
            this.queryFields = queryFields.length > 0 ? queryFields : null;
            this.queryData = {};
            // --- Check if we can add a new entity ---.
            let canAdd = settings.addButton;
            if (canAdd) {
                const [path, options] = this.getRequestPath(
                    this.getActionContext(), settings.primaryRequest, "save"
                );
                if (path) {
                    try {
                        const defaultData = await this.api.get(path, options);
                        this.queryData = Object.assign({}, this.queryData, defaultData);
                    } catch (e) {
                        canAdd = false;
                    }
                } else {
                    canAdd = false;
                }
            }
            const actionCtx = this.getActionContext();
            this.addButton = selectBtnProp(canAdd, actionCtx, "add", "plus", null);
            // --- Start creating table settings ---
            const actionsKey = `${settings.id}-actions`;
            const labelPrefix = settings.labelPrefix || settings.id;
            this.tableColumns = await createTableColumnsForSchema(
                this.schema,
                settings.id,
                settings.labelPrefix || settings.id,
                settings.actionsTitle || this.actionsTitle,
                settings.listQuery,
                settings.listSort,
                (column, property) => settings.customizeListColumn(
                    column, this.injector, property, this.snapshot.params, this.context
                )
            );
            // --- Create data loader ---
            this.dataLoader = async (page, itemsPerPage, orderBy, orderDescending, filter, query, controller) => {
                const [path, options] = this.getRequestPath(
                    this.getActionContext(), settings.primaryRequest, "request"
                );
                const actionCtx = this.getActionContext();
                const actions = [
                    {
                        id: "view",
                        button: settings.viewButton,
                        title: `action.${labelPrefix}.view`
                    },
                    {
                        id: "edit",
                        button: settings.editButton,
                        title: `action.${labelPrefix}.edit`
                    },
                    {
                        id: "delete",
                        button: settings.deleteButton,
                        title: `action.${labelPrefix}.delete`
                    },
                    ...settings.customActions,
                ];
                // --- Build the base query params ---
                const params: HttpRequestQuery = {
                    // Original values from the "getRequestPath" method
                    ...(options.params || {}),
                    // Serialized "query form" values
                    ...(this.filterParams || {}),
                    // Base list parameters
                    ...this.api.makeListParams(page, itemsPerPage, orderBy, orderDescending)
                };
                // --- What came from the fixed request, or from the serialized query form, otherwise what we typed into the dynamic table search field
                params[this.filterParamName] = params[this.filterParamName] || filter;
                // --- Build complex query filter params ---
                params[this.queryParamName] = {
                    // First, what was put into it maybe from the "getRequestPath" method
                    ...(params[this.queryParamName] || {}),
                    // Then what we set in the dynamic table headers
                    ...query
                };

                const data = await this.api.list(path, params, {
                    ...options,
                    controller
                });

                let {total, items, meta} = Object.assign({total: 0, items: [], meta: {}}, data);
                let hasActions = true;
                // --- Process items actions ---
                items?.forEach(item => {
                    const itemActions = actions.map(action => {
                        const icon = selectBtnProp(action.button, actionCtx, action.id, defaultIcons[action.id], item);
                        const status = selectBtnProp(action.status, actionCtx, action.id, null, item);
                        return !icon ? null : {
                            title: action.title,
                            icon,
                            status,
                            action: (it: any, ev: MouseEvent) => this.callAction(action.id, it, ev),
                            path: actionsWithPath.includes(action.id)
                                ? defaultCrudPath(actionCtx, item, action.id) : null,
                            testId: StringUtils.camelize(`${action.id}-button`)
                        };
                    }).filter(Boolean);
                    hasActions = hasActions && itemActions.length > 0;
                    item[actionsKey] = itemActions;
                });
                //  --- Add/remove actions column ---
                this.tableColumns = Object.assign({}, this.tableColumns);
                if (!hasActions) {
                    delete this.tableColumns[actionsKey];
                }
                // --- Set new data ---
                this.data = data;
                this.updateSelected();
                this.context = Object.assign(
                    {},
                    this.snapshot.data.context,
                    {
                        dataSource: this.table,
                        page: {total, items, meta}
                    }
                );
                await settings.itemsListed(this.context, this.injector);
                this.generateButtons();

                return {...data};
            };
            this.dataItems = settings.listPreview
                ? (await this.dataLoader(1, settings.itemsPerPage, settings.orderBy, settings.orderDescending, "", {}, null)).items
                : null;
        }, 50);
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            ObservableUtils.subscribe(
                {
                    subjects: [this.route.data, this.route.params, ...(subjects ?? [])],
                    cb: () => {
                        this.table?.refresh();
                    }
                },
                {
                    subjects: [this.events.languageChanged, this.events.userChanged],
                    cb: () => {
                        if (!this.updateSettings) {
                            console.error(`UpdateSettings is not defined for some reason`);
                            return;
                        }
                        this.updateSettings.run();
                    }
                },
                {
                    subjects: !this.wrapper ? [] : [this.wrapper.beforeState, this.wrapper.afterState],
                    cb: () => this.updateSelected()
                }
            )
        );
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.updateSettings?.clear();
    }

    ngOnChanges(): void {
        this.updateSettings?.run();
    }

    addItem(): void {
        this.toaster.handleAsyncMethod(() => this.callAction("add"));
    }

    refresh(): void {
        this.table?.refresh();
    }

    updateFilters(ev: FormFieldChangeEvent): void {
        ev.form.serialize(false).then(filter => {
            this.filterParams = filter;
            this.refresh();
        });
    }

    async callAction(setting: CrudButtonActionSetting, item?: Record<string, any>, ev?: MouseEvent): Promise<IAsyncMessage> {
        ev?.stopPropagation();
        const action = !setting
            ? null
            : (ObjectUtils.isFunction(setting) ? setting(this.getActionContext(), this.injector, item) : setting);
        if (!action) return null;
        try {
            let message: any = null;
            const actionCtx = this.getActionContext();
            switch (action) {
                case "add":
                    message = await this.settings.addAction(actionCtx, item, action);
                    break;
                case "view":
                    message = await this.settings.viewAction(actionCtx, item, action);
                    break;
                case "edit":
                    message = await this.settings.editAction(actionCtx, item, action);
                    break;
                case "delete":
                    if (this.settings.deleteAction) {
                        message = await this.settings.deleteAction(actionCtx, item, action);
                        break;
                    }
                    this.deleteItem(item);
                    break;
                default:
                    const custom = this.settings.customActions.find(t => t.id == action);
                    if (!custom || !ObjectUtils.isFunction(custom.action)) {
                        console.error(`Custom action "${custom.id} ${action}" is not a function`);
                        return null;
                    }
                    message = await custom.action(actionCtx, item, custom.id);
                    break;
            }
            if (ObjectUtils.isObject(message) && message?.message) {
                return message;
            }
            return null;
        } catch (e) {
            console.warn(e);
            const msg = `message.${this.settings.id}-${action}.error`;
            throw {
                message: `${e.message || msg}`,
                context: {reason: e}
            };
        }
    }

    deleteItem(entity: any): void {
        const id = this.settings.id;
        this.dialog.confirm({
            message: `message.delete-${id}.confirm`,
            messageContext: entity,
            method: async () => {
                try {
                    const [path, options] = this.getRequestPath(
                        {
                            ...this.getActionContext(),
                            entity
                        },
                        this.settings.primaryRequest, "delete"
                    );
                    await this.api.delete(path, options);
                    this.table?.refresh();
                    return {
                        message: `message.delete-${id}.success`
                    };
                } catch (reason) {
                    throw {
                        message: `message.delete-${id}.error`,
                        context: {reason}
                    };
                }
            }
        });
    }

    getActionContext(): ICrudRouteActionContext {
        return {
            ...super.getActionContext(),
            dataSource: this.table,
            page: this.data
        };
    }

    protected updateSelected(): void {
        if (!this.wrapper || !this.settings) {
            this.selectedItem = null;
            return;
        }
        const {beforeState, afterState} = this.wrapper;
        const dataType = this.settings.getDataType;
        const state = [beforeState.value, afterState.value].find(s => {
            const settings = s.data.settings as ICrudRouteSettings;
            return settings && settings.getDataType === dataType;
        });
        const id = !state ? null : state.params.id || null;
        this.selectedItem = !state || !this.data
            ? null
            : this.data.items.find(t => t.id === id || t._id === id);
    }
}
