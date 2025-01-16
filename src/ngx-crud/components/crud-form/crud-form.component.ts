import {Component, OnInit} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {HttpErrorResponse} from "@angular/common/http";
import {Subscription} from "rxjs";
import {DynamicFormGroupModel, DynamicFormModel, IDynamicForm} from "@stemy/ngx-dynamic-form";
import {FileUtils, IAsyncMessage, ObjectUtils, ObservableUtils} from "@stemy/ngx-utils";

import {ICrudComponent, ICrudRouteActionContext, ICrudTreeItem} from "../../common-types";
import {selectBtnProp} from "../../utils/crud.utils";
import {BaseCrudComponent} from "../base/base-crud.component";

@Component({
    standalone: false,
    selector: "crud-form",
    styleUrls: ["./crud-form.component.scss"],
    templateUrl: "./crud-form.component.html",
})
export class CrudFormComponent extends BaseCrudComponent implements OnInit {

    id: string;
    saveButton: string;
    data: Record<string, any>;
    files: any;

    formGroupModel: DynamicFormGroupModel;
    formModel: DynamicFormModel;
    formGroup: FormGroup;
    formChanged: boolean;

    ngOnInit() {
        super.ngOnInit();
        this.data = {};
        this.files = {};
        this.forms.getFormGroupModelForSchema(this.requestType, this.settings.customizeFormModel)
            .then(m => this.initForm(m))
            .catch(console.warn);
    }

    importFile = async (ie: string): Promise<IAsyncMessage> => {
        try {
            const path = await this.settings.getRequestPath(
                this.endpoint, this.data, this.settings.primaryRequest, "import", this.injector, ie
            );
            const response = await this.api.post(path, {file: this.files[ie]});
            this.forms.patchGroup(response, this.formModel, this.formGroup);
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
            const path = await this.settings.getRequestPath(
                this.endpoint, this.data, this.settings.primaryRequest, "export", this.injector, ie
            );
            const response = await this.api.get(path, {responseType: "blob"});
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
            additionalResources = await this.settings.customizeSerializedData(data, this.injector, this.formModel, this.context);
        } catch (error) {
            throw {
                message: `${error}`
            }
        }
        const action = this.snapshot.data.id;
        try {
            data = ObjectUtils.assign(context, data);
            const path = await this.settings.getRequestPath(
                this.endpoint, this.data, this.settings.primaryRequest, "save", this.injector
            );
            const response = this.settings.primaryRequest === "edit"
                ? await this.api.patch(path, data)
                : await this.api.post(path, data);
            await this.settings.updateAdditionalResources(additionalResources, this.injector, response, this.context);
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
            entity: this.data,
        };
    }

    protected async onLeave(tree: ICrudTreeItem[]): Promise<boolean> {
        if (this.formChanged) {
            const ctx = await this.forms.serialize(this.formModel, this.formGroup);
            const result = await new Promise<boolean>(resolve => {
                this.dialog.confirm({
                    message: 'message.leave-without-changes.confirm',
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
        for (let item of tree) {
            const comp = item.component as ICrudComponent;
            if (!comp.getActionContext) continue;
            const context = comp.getActionContext();
            if (!context.dataSource) continue;
            context.dataSource.refresh();
        }
        return true;
    }

    protected async navigateBack(): Promise<void> {
        const path = await this.settings.getBackPath(this.context, this.endpoint);
        await this.router.navigateByUrl(path);
    }

    protected initForm(model: DynamicFormGroupModel): void {
        this.formGroupModel = model;
        this.formModel = model.group;
        this.formGroup = this.forms.createFormGroup(this.formModel, {updateOn: "blur"});
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            this.formGroup.valueChanges.subscribe(() => {
                this.formChanged = this.formGroup.touched;
            }),
            this.subToState()
        );
    }

    protected subToState(): Subscription {
        return ObservableUtils.subscribe({
            subjects: [this.route.data, this.route.params],
            cb: async () => {
                this.id = this.snapshot.params.id;
                this.saveButton = selectBtnProp(this.settings.saveButton, this.getActionContext(), "save", "save");
                try {
                    const path = await this.settings.getRequestPath(
                        this.endpoint, {...this.data, id: this.id}, this.settings.primaryRequest, "request", this.injector
                    );
                    // Get basic data
                    const data = await this.api.get(path);
                    delete data._id;
                    // Customize data
                    this.data = await this.settings.customizeFormData(data, this.injector, this.formModel, this.context) ?? data;
                    this.context = Object.assign(
                        {},
                        this.snapshot.data.context,
                        {entity: this.data}
                    );
                    this.formChanged = false;
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
                this.forms.patchGroup(this.data, this.formModel, this.formGroup);
                this.cdr.detectChanges();
            }
        });
    }
}
