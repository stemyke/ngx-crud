import {AfterViewInit, Component, OnChanges, OnInit, Type, ViewChild} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {
    DynamicTableComponent,
    IAsyncMessage,
    IOpenApiSchema,
    IPaginationData,
    ITableColumns,
    ITimer,
    ObjectUtils,
    ObservableUtils,
    TableDataLoader,
    TimerUtils,
    DynamicTableDragHandler
} from "@stemy/ngx-utils";
import {DynamicFormModel, IDynamicFormEvent} from "@stemy/ngx-dynamic-form";
import {CrudButtonActionSetting, ICrudList, ICrudRouteActionContext} from "../../common-types"
import {selectBtnProp} from "../../utils/crud.utils";
import {BaseCrudComponent} from "../base/base-crud.component";

@Component({
    standalone: false,
    selector: "crud-list",
    templateUrl: "./crud-list.component.html"
})
export class CrudListComponent extends BaseCrudComponent implements OnInit, AfterViewInit, OnChanges, ICrudList {

    dataLoader: TableDataLoader;
    filterModel: DynamicFormModel;
    filterGroup: FormGroup;

    tableColumns: ITableColumns;
    cellComponent: Type<any>;
    data: IPaginationData;
    dragStartFn: DynamicTableDragHandler;
    dragEnterFn: DynamicTableDragHandler;
    dropFn: DynamicTableDragHandler;

    columnNames: string[];
    addButton: string;

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
        this.dragStartFn = (ev) => {
            return this.settings.onDragStart(ev, this.getActionContext(), this.injector);
        };
        this.dragEnterFn = (ev) => {
            return this.settings.onDragEnter(ev, this.getActionContext(), this.injector);
        };
        this.dropFn = (ev) => {
            return this.settings.onDrop(ev, this.getActionContext(), this.injector);
        };
        this.updateSettings = TimerUtils.createTimeout(async () => {
            const settings = this.settings;
            const requestType = this.requestType;
            if (!settings) return;
            // --- Update filter models ---
            this.filterModel = settings.filterForm ? await this.forms.getFormModelForSchema(requestType) : null;
            this.filterGroup = this.filterModel ? this.forms.createFormGroup(this.filterModel, {updateOn: "blur"}) : null;
            this.schema = await this.openApi.getSchema(requestType);
            if (!this.schema) {
                console.log(`Schema by name '${requestType}' not found`);
                return;
            }
            // --- Check if we can add a new entity ---
            let canAdd = settings.addButton;
            if (canAdd || this.filterGroup) {
                try {
                    const path = await settings.getRequestPath(
                        this.endpoint, null, settings.primaryRequest, "save", this.injector
                    );
                    const data = await this.api.get(path);
                    if (this.filterGroup) {
                        this.forms.patchGroup(data, this.filterModel, this.filterGroup);
                    }
                } catch (e) {
                    canAdd = false;
                }
            }
            const actionCtx = this.getActionContext();
            this.addButton = selectBtnProp(canAdd, actionCtx, "add", "plus-outline", null);
            // --- Start creating table settings ---
            const columns = {} as ITableColumns;
            const actionsKey = `${settings.id}-actions`;
            const props = this.schema.properties;
            const propNames = Object.keys(props).concat(actionsKey);
            const labelPrefix = settings.labelPrefix ? settings.labelPrefix : settings.id;
            for (const name of propNames) {
                const property = props[name] || {
                    id: actionsKey,
                    type: "actions",
                    format: "array",
                    column: true,
                    disableFilter: true
                };
                if (property.column === false) continue;
                const title = name === actionsKey
                    ? ` `
                    : await this.language.getTranslation(`${labelPrefix}.${name}`);
                const column = await settings.customizeListColumn(
                    {
                        name,
                        title,
                        sort: name,
                        filter: settings.filter && property.type === "string" && property.format !== "date" && !property.disableFilter,
                        filterType: property.filterType,
                        property,
                    },
                    this.injector, property, this.state.params, this.context
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
                const endpoint = await settings.getRequestPath(
                    this.endpoint, null, settings.primaryRequest, "request", this.injector
                );
                const actions = [
                    {
                        id: "view",
                        button: settings.viewButton,
                        icon: this.crud.getIcon("view"),
                        title: `action.${labelPrefix}.view`
                    },
                    {
                        id: "edit",
                        button: settings.editButton,
                        icon: this.crud.getIcon("edit"),
                        title: `action.${labelPrefix}.edit`
                    },
                    {
                        id: "delete",
                        button: settings.deleteButton,
                        icon: this.crud.getIcon("delete"),
                        title: `action.${labelPrefix}.delete`
                    },
                    ...settings.customActions,
                ];
                const params = this.api.makeListParams(page, rowsPerPage, orderBy, orderDescending);
                params[this.filterName] = filter;
                params.query = query;

                const data = await this.api.list(endpoint, params);
                let {total, items, meta} = Object.assign({total: 0, items: [], meta: {}}, data);
                items?.forEach(item => {
                    item[actionsKey] = actions.map(action => {
                        const icon = selectBtnProp(action.button, actionCtx, action.id, action.icon, item);
                        const status = selectBtnProp(action.status, actionCtx, action.id, null, item);
                        return !icon ? null : {
                            title: action.title,
                            icon,
                            status,
                            action: () => this.callAction(action.id, item)
                        };
                    }).filter(Boolean);
                });
                this.data = data;
                this.context = Object.assign(
                    {},
                    this.state.data.context,
                    {
                        dataSource: this.table,
                        page: {total, items, meta}
                    }
                );
                await settings.itemsListed(this.context, this.injector);
                this.generateButtons();
                return data;
            };
        }, 10);
        this.updateSettings?.run();
    }

    ngAfterViewInit(): void {
        const dependencies = this.settings.listDependencies;
        const subjects = ObjectUtils.isArray(dependencies)
            ? dependencies
            : (ObjectUtils.isFunction(dependencies) ? dependencies(this.injector) : []);
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            ObservableUtils.subscribe(
                {
                    subjects: [this.state.$observable, ...(subjects ?? [])],
                    cb: () => this.table?.refresh()
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
                }
            )
        );
    }

    ngOnChanges(): void {
        this.updateSettings?.run();
    }

    addItem(): void {
        this.toaster.handleAsyncMethod(() => this.callAction("add"));
    }

    updateFilters(ev: IDynamicFormEvent): void {
        this.forms.serializeForm(ev.form).then(filter => {
            this.filterParams = filter;
        });
    }

    async callAction(setting: CrudButtonActionSetting, item?: any): Promise<IAsyncMessage> {
        const action = !setting
            ? null
            : (ObjectUtils.isFunction(setting) ? setting(this.getActionContext(), this.injector, item) : setting);
        if (!action) return null;
        try {
            let message: any = null;
            const actionCtx = this.getActionContext();
            switch (action) {
                case "add":
                    message = await this.settings.addAction(this.injector, action, actionCtx, item);
                    break;
                case "view":
                    message = await this.settings.viewAction(this.injector, action, actionCtx, item);
                    break;
                case "edit":
                    message = await this.settings.editAction(this.injector, action, actionCtx, item);
                    break;
                case "delete":
                    if (this.settings.deleteAction) {
                        message = await this.settings.deleteAction(this.injector, action, actionCtx, item);
                        break;
                    }
                    this.deleteItem(item);
                    break;
                default:
                    const custom = this.settings.customActions.find(t => t.id == action);
                    if (!custom || !ObjectUtils.isFunction(custom.action)) {
                        console.error(`Custom action '${custom.id} ${action}' is not a function`);
                        return null;
                    }
                    message = await custom.action(this.injector, custom.id, actionCtx, item);
                    break;
            }
            if (ObjectUtils.isObject(message) && message?.message) {
                return message;
            }
            return null;
        } catch (e) {
            const msg = `message.${this.settings.id}-${action}.error`;
            throw {
                message: `${e.message || msg}`,
                context: {reason: e}
            };
        }
    }

    deleteItem(item: any): void {
        const id = this.settings.id;
        this.dialog.confirm({
            message: `message.delete-${id}.confirm`,
            messageContext: item,
            method: async () => {
                try {
                    const path = await this.settings.getRequestPath(
                        this.endpoint, item, this.settings.primaryRequest, "delete", this.injector
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

    protected getActionContext(): ICrudRouteActionContext {
        return {
            ...super.getActionContext(),
            dataSource: this.table,
            page: this.data
        };
    }
}
