import {Component, OnChanges, Type, ViewChild, ViewEncapsulation} from "@angular/core";
import {
    DynamicTableComponent,
    DynamicTableDragHandler,
    IAsyncMessage, IconMap,
    IOpenApiSchema,
    IPaginationData,
    ITableColumns,
    ITimer,
    ObjectUtils,
    ObservableUtils,
    TableDataLoader,
    TableFilterType,
    TimerUtils
} from "@stemy/ngx-utils";
import {FormFieldConfig} from "@stemy/ngx-dynamic-form";
import {CrudButtonActionSetting, ICrudList, ICrudRouteActionContext, ICrudRouteSettings} from "../../common-types"
import {selectBtnProp} from "../../utils/crud.utils";
import {BaseCrudComponent} from "../base/base-crud.component";

const defaultIcons: IconMap = {
    view: "eye",
    edit: "pencil",
    delete: "trash"
};

@Component({
    standalone: false,
    selector: "crud-list",
    templateUrl: "./crud-list.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudListComponent extends BaseCrudComponent implements OnChanges, ICrudList {

    dataLoader: TableDataLoader;
    queryFieldGroup: FormFieldConfig;
    queryData: Record<string, any>;

    tableColumns: ITableColumns;
    cellComponent: Type<any>;
    data: IPaginationData;
    dragStartFn: DynamicTableDragHandler;
    dragEnterFn: DynamicTableDragHandler;
    dropFn: DynamicTableDragHandler<void>;

    columnNames: string[];
    addButton: string;
    selectedItem: any;

    protected schema: IOpenApiSchema;
    protected updateSettings: ITimer;
    protected filterParams: any;

    @ViewChild("table")
    protected table: DynamicTableComponent;

    ngOnInit(): void {
        super.ngOnInit();
        this.tableColumns = null;
        this.cellComponent = this.crud.getComponentType("cell");
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
        this.updateSettings = TimerUtils.createTimeout(async () => {
            const settings = this.settings;
            if (!settings) return;

            // --- Update query models ---
            const requestType = settings.getDataType(this.context, this.injector);
            this.queryFieldGroup = settings.queryForm ? await this.forms.getFormFieldGroupForSchema(requestType) : null;
            this.schema = await this.openApi.getSchema(requestType);
            if (!this.schema) {
                console.log(`Schema by name "${requestType}" not found`);
                return;
            }
            // --- Check if we can add a new entity ---
            let canAdd = settings.addButton;
            if (canAdd || this.queryFieldGroup) {
                try {
                    const path = settings.getRequestPath(
                        this.getActionContext(), settings.primaryRequest, "save"
                    );
                    this.queryData = await this.api.get(path);
                } catch (e) {
                    canAdd = false;
                }
            }
            const actionCtx = this.getActionContext();
            this.addButton = selectBtnProp(canAdd, actionCtx, "add", "plus", null);
            // --- Start creating table settings ---
            const columns = {} as ITableColumns;
            const actionsKey = `${settings.id}-actions`;
            const props = this.schema.properties;
            const propNames = Object.keys(props).concat(actionsKey);
            const labelPrefix = settings.labelPrefix || settings.id;
            for (const name of propNames) {
                const property = props[name] || {
                    id: actionsKey,
                    type: "actions",
                    format: "array",
                    column: true,
                    disableSort: true,
                    disableFilter: true,
                };
                if (property.column === false) continue;
                const title = name === actionsKey
                    ? settings.actionsTitle || this.actionsTitle
                    : `${labelPrefix}.${name}`;
                let filterType: TableFilterType = null;
                switch (property.type) {
                    case "array":
                        if (property.items?.enum) {
                            filterType = "enum";
                        }
                        break;
                    case "string":
                        if (property.enum) {
                            filterType = "enum";
                        } else if (property.format !== "date") {
                            filterType = "text";
                        }
                        break;
                    case "boolean":
                        filterType = "checkbox";
                        break;
                }
                const column = await settings.customizeListColumn(
                    {
                        name,
                        title,
                        sort: property.disableSort ? null : name,
                        filter: settings.query && filterType && !property.disableFilter,
                        filterType,
                        enum: property.enum || property.items?.enum || [],
                        enumPrefix: property.enumPrefix,
                        property,
                    },
                    this.injector, property, this.snapshot.params, this.context
                );
                if (!column) {
                    continue;
                }
                if (Array.isArray(column)) {
                    column.forEach(c => {
                        columns[c.name] = c;
                    });
                    continue;
                }
                columns[column.name] = column;
            }
            this.tableColumns = columns;
            this.columnNames = Object.keys(columns);
            // --- Create data loader ---
            this.dataLoader = async (page, rowsPerPage, orderBy, orderDescending, filter, query) => {
                const endpoint = settings.getRequestPath(
                    this.getActionContext(), settings.primaryRequest, "request"
                );
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
                const params = this.api.makeListParams(page, rowsPerPage, orderBy, orderDescending);
                params[this.filterParamName] = filter;
                params[this.queryParamName] = query;

                const data = await this.api.list(endpoint, params);
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
                            action: (_, ev: MouseEvent) => this.callAction(action.id, item, ev)
                        };
                    }).filter(Boolean);
                    hasActions = hasActions && itemActions.length > 0;
                    item[actionsKey] = itemActions;
                });
                //  --- Add/remove actions column ---
                this.tableColumns = Object.assign({}, columns);
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
                    subjects: [this.events.languageChanged, this.auth.userChanged],
                    cb: () => {
                        if (!this.updateSettings) {
                            console.error(`UpdateSettings is not defined for some reason`, this.updateSettings);
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
    //
    // updateFilters(ev: IDynamicFormEvent): void {
    //     this.forms.serializeForm(ev.form).then(filter => {
    //         this.filterParams = filter;
    //     });
    // }

    async callAction(setting: CrudButtonActionSetting, item?: any, ev?: MouseEvent): Promise<IAsyncMessage> {
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
                    const path = this.settings.getRequestPath(
                        {
                            ...this.getActionContext(),
                            entity
                        },
                        this.settings.primaryRequest, "delete"
                    );
                    await this.api.delete(path);
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
