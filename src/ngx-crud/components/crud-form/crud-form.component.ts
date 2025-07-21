import {Component, linkedSignal, OnInit, viewChild, ViewEncapsulation} from "@angular/core";
import {HttpErrorResponse} from "@angular/common/http";
import {rxResource} from "@angular/core/rxjs-interop";
import {FormControl} from "@angular/forms";
import {filter} from "rxjs";
import {FormFieldConfig, IDynamicForm} from "@stemy/ngx-dynamic-form";
import {FileUtils, IAsyncMessage, ObjectUtils, ObservableUtils} from "@stemy/ngx-utils";

import {ICrudComponent, ICrudRouteActionContext, CrudTreeItem} from "../../common-types";
import {selectBtnProp} from "../../utils/crud.utils";
import {BaseCrudComponent} from "../base/base-crud.component";

@Component({
    standalone: false,
    selector: "crud-form",
    styleUrls: ["./crud-form.component.scss"],
    templateUrl: "./crud-form.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudFormComponent extends BaseCrudComponent implements OnInit {

    id: string;
    saveButton: string;
    data: Record<string, any>;
    files: any;
    loading: boolean;

    formFieldGroup: FormFieldConfig;
    formFields: FormFieldConfig[];
    formUpdated: boolean;

    readonly form = viewChild<IDynamicForm>("crudForm");

    protected readonly formChanged$ = rxResource({
        request: () => this.form(),
        loader: p => p.request?.fieldChanges?.pipe(
            filter(c => {
                const control = c.field?.formControl as FormControl;
                return c.type === "valueChanges" && control.value !== control.defaultValue;
            })
        ),
        defaultValue: null
    });

    protected readonly formChanged = linkedSignal(() => {
        return this.formChanged$.value();
    });

    ngOnInit() {
        super.ngOnInit();
        this.data = {};
        this.files = {};
        this.loading = false;
        this.formUpdated = false;
        this.initForm().then(() => this.subToState());
    }

    reset() {
        this.form().reset();
        this.formChanged.set(null);
    }

    importFile = async (ie: string): Promise<IAsyncMessage> => {
        try {
            const [path, options] = this.getRequestPath(
                this.getActionContext(), this.settings.primaryRequest, "import", ie
            );
            const response = await this.api.post(path, {file: this.files[ie]}, options);
            this.data = ObjectUtils.assign(this.data, response);
            return {
                message: `message.import-${ie}.success`
            };
        } catch (reason) {
            throw {
                message: `message.import-${ie}.error`,
                context: {reason}
            };
        }
    }

    exportFile = async (ie: string): Promise<IAsyncMessage> => {
        try {
            const [path, options] = this.getRequestPath(
                this.getActionContext(), this.settings.primaryRequest, "export", ie
            );
            const response = await this.api.get(path, {...options, responseType: "blob"});
            FileUtils.saveBlob(response, `export-${this.id}-${ie}.zip`);
            return {
                message: `message.import-${ie}.success`
            };
        } catch (reason) {
            throw {
                message: `message.import-${ie}.error`,
                context: {reason}
            };
        }
    }

    sendForm = async (form: IDynamicForm, context: any = {}): Promise<IAsyncMessage> => {
        let data: any = null;
        try {
            data = await this.forms.serializeForm(form, true);
        } catch (e) {
            return null;
        }
        let additionalResources = {};
        try {
            additionalResources = await this.settings.customizeSerializedData(data, this.injector, this.formFieldGroup, this.context);
        } catch (error) {
            throw {
                message: `${error}`
            }
        }
        const action = this.snapshot.data.id;
        try {
            data = ObjectUtils.assign(context, data);
            const [path, options] = this.getRequestPath(
                this.getActionContext(), this.settings.primaryRequest, "save"
            );
            const response = this.settings.primaryRequest === "edit"
                ? await this.api.patch(path, data, options)
                : await this.api.post(path, data, options);
            await this.settings.updateAdditionalResources(additionalResources, this.injector, response, this.context);
            // The form isn't changed anymore but updated
            this.formUpdated = this.formChanged() !== null;
            this.formChanged.set(null);
            // Update context
            this.data = ObjectUtils.assign(this.data, response);
            this.context = Object.assign(
                {},
                this.snapshot.data.context,
                {entity: this.data}
            );
            // Navigate to where its needed
            await this.navigateBack();
            return {
                message: `message.${action}.success`,
                context: response
            };
        } catch (res) {
            console.log(res);
            const error = ObjectUtils.isObject(res.error) ? res.error.message : res.error;
            throw {
                message: error ? ((error as string).indexOf("Error") > -1 ? `message.${action}.error` : error) : `message.${action}.error`,
                context: {reason: res.error}
            }
        }
    }

    getActionContext(): ICrudRouteActionContext {
        return {
            ...super.getActionContext(),
            entity: {...this.data, id: this.id},
        };
    }

    protected async onLeave(tree: CrudTreeItem[]): Promise<boolean> {
        if (this.formChanged()) {
            const ctx = await this.forms.serialize(this.formFields);
            const result = await new Promise<boolean>(resolve => {
                this.dialog.confirm({
                    message: `message.leave-without-changes.confirm`,
                    messageContext: ctx,
                    method: async () => {
                        resolve(true);
                        return null;
                    },
                    cancelMethod: async () => {
                        resolve(false);
                        return null;
                    }
                })
            });
            if (!result) return false;
        }
        this.refreshList(tree);
        return true;
    }

    protected refreshList(tree: CrudTreeItem[]): void {
        if (!this.formUpdated) return;
        for (let item of tree) {
            const comp = item.component as ICrudComponent;
            if (!comp?.getActionContext) continue;
            const context = comp.getActionContext();
            if (!context.dataSource) continue;
            context.dataSource.refresh();
        }
        this.formUpdated = false;
    }

    protected async navigateBack(): Promise<void> {
        if (this.settings.mode === 'inline' && this.id) {
            const tree = this.crud.getTree(this.snapshot);
            this.refreshList(tree);
            return;
        }
        const path = this.settings.getBackPath(this.getActionContext());
        await this.router.navigateByUrl(path);
    }

    protected async initForm() {
        const settings = this.settings;
        const dataType = this.settings.getDataType(this.context, this.injector);
        this.formFieldGroup = await this.forms.getFormFieldGroupForSchema(dataType, {
            labelPrefix: settings.labelPrefix || settings.id,
            labelCustomizer: settings.customizeFormLabel,
            testId: settings.id,
            context: this.context,
            fieldCustomizer: settings.customizeFormField
        });
        this.formFields = this.formFieldGroup.fieldGroup;
    }

    protected async customizeFormData(data: any): Promise<any> {
        return await this.settings.customizeFormData(data, this.injector, this.formFieldGroup, this.context)
            ?? data;
    }

    protected subToState() {
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            ObservableUtils.subscribe({
                subjects: [this.route.data, this.route.params],
                cb: async () => {
                    this.loading = true;
                    this.id = this.snapshot.params.id;
                    this.saveButton = selectBtnProp(this.settings.saveButton, this.getActionContext(), "save", "save");

                    try {
                        const [path, options] = this.getRequestPath(
                            this.getActionContext(), this.settings.primaryRequest, "request"
                        );
                        // Customize data
                        const data = await this.api.get(path, options);
                        this.data = this.customizeFormData(data);
                        this.context = Object.assign(
                            {},
                            this.snapshot.data.context,
                            {entity: this.data}
                        );
                        this.formChanged.set(null);
                        this.generateButtons();
                    } catch (res) {
                        if (res instanceof HttpErrorResponse) {
                            const errorObj = res.message || res.error;
                            const error = ObjectUtils.isObject(errorObj) ? `${errorObj.message}` : `${res.error}`;
                            const action = `load-${this.id}`;
                            this.toaster.error(error
                                    ? (error.indexOf("Error") > -1 ? `message.${action}.error` : error)
                                    : `message.${action}.error`,
                                {reason: res.error}
                            );
                        } else {
                            console.log(`Error happened in form, should navigate back`, res);
                        }
                        await this.navigateBack();
                        return;
                    }
                    this.formChanged.set(null);
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                timeout: 25
            })
        );
    }
}
