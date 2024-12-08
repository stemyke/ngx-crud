import {AfterViewInit, Component, OnChanges, OnDestroy, Type, ViewChild} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {
    DynamicTableComponent,
    IAsyncMessage,
    IOpenApiSchema,
    ITableColumns,
    ITimer,
    ObjectUtils,
    ObservableUtils,
    TableDataLoader,
    TimerUtils
} from "@stemy/ngx-utils";
import {DynamicFormModel, IDynamicFormEvent} from "@stemy/ngx-dynamic-form";
import {CrudButtonIconSetting, ICrudList, ICrudRouteButtonContext} from "../../common-types"
import {BaseCrudComponent} from "../base/base-crud.component";

@Component({
    standalone: false,
    selector: "crud-list",
    templateUrl: "./crud-list.component.html"
})
export class CrudListComponent extends BaseCrudComponent implements OnDestroy, AfterViewInit, OnChanges, ICrudList {

    dataLoader: TableDataLoader;
    filterModel: DynamicFormModel;
    filterGroup: FormGroup;
    tableColumns: ITableColumns;
    cellComponent: Type<any>;
    columnNames: string[];
    addButton: string;

    protected schema: IOpenApiSchema;
    protected updateSettings: ITimer;
    protected filterParams: any;

    @ViewChild("table")
    protected table: DynamicTableComponent;

    ctrInit(): void {
        super.ctrInit();
        this.tableColumns = null;
        this.cellComponent = this.crud.getComponentType("cell");
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
            // --- Button checker ---
            const selectActionProp = <T = string>(prop: CrudButtonIconSetting<T>, action: string, value: T, item: any): T => {
                prop = ObjectUtils.isFunction(prop) ? prop(this.injector, action, this.getButtonContext(), item) : prop;
                if (!prop) return null;
                return ObjectUtils.isString(prop) ? prop : value
            };
            // --- Check if we can add a new entity ---
            let canAdd = settings.addButton;
            if (canAdd || this.filterGroup) {
                try {
                    const path = this.endpoint + await settings.getRequestPath(
                        null, settings.primaryRequest, "save", this.injector
                    );
                    const data = await this.api.get(path);
                    if (this.filterGroup) {
                        this.forms.patchGroup(data, this.filterModel, this.filterGroup);
                    }
                } catch (e) {
                    canAdd = false;
                }
            }
            this.addButton = selectActionProp(canAdd, "add", "plus-outline", null);
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
            const endpoint = this.endpoint + await settings.getRequestPath(
                null, settings.primaryRequest, "request", this.injector
            );
            this.dataLoader = async (page, rowsPerPage, orderBy, orderDescending, filter, query) => {
                const actions = [
                    {
                        id: "view",
                        button: settings.viewButton,
                        icon: "eye-outline",
                        title: `action.${labelPrefix}.view`
                    },
                    {
                        id: "edit",
                        button: settings.editButton,
                        icon: "edit-outline",
                        title: `action.${labelPrefix}.edit`
                    },
                    {
                        id: "delete",
                        button: settings.deleteButton,
                        icon: "trash-outline",
                        title: `action.${labelPrefix}.delete`
                    },
                    ...settings.customActions,
                ];
                const params = this.api.makeListParams(page, rowsPerPage, orderBy, orderDescending);
                params[this.filterName] = filter;
                params.query = query;

                const data = await this.api.list(endpoint, params);
                const items = data.items || [];

                items.forEach(item => {
                    item[actionsKey] = actions.map(action => {
                        const icon = selectActionProp(action.button, action.id, action.icon, item);
                        const status = selectActionProp(action.status, action.id, null, item);
                        return !icon ? null : {
                            title: action.title,
                            icon,
                            status,
                            action: () => this.callAction(action.id, item)
                        };
                    }).filter(Boolean);
                });
                await settings.itemsListed(items, this.injector, this.context);
                return data;
            };
        }, 10);
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
                    subjects: subjects ?? [],
                    cb: () => this.table?.refresh()
                },
                {
                    subjects: [this.events.languageChanged, this.auth.userChanged],
                    cb: () => this.updateSettings?.run()
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

    async callAction(action: string, item?: any): Promise<IAsyncMessage> {
        if (!action) return null;
        try {
            let message: any = null;
            const btnContext = this.getButtonContext();
            switch (action) {
                case "add":
                    message = await this.settings.addAction(this.injector, action, btnContext, item);
                    break;
                case "view":
                    message = await this.settings.viewAction(this.injector, action, btnContext, item);
                    break;
                case "edit":
                    message = await this.settings.editAction(this.injector, action, btnContext, item);
                    break;
                case "delete":
                    if (this.settings.deleteAction) {
                        message = await this.settings.deleteAction(this.injector, action, btnContext, item);
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
                    message = await custom.action(this.injector, custom.id, btnContext, item);
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
                    const path = this.endpoint + await this.settings.getRequestPath(
                        item._id || item.id, this.settings.primaryRequest, "delete", this.injector
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

    protected getButtonContext(): ICrudRouteButtonContext {
        return {
            ...super.getButtonContext(),
            dataSource: this.table
        };
    }
}
