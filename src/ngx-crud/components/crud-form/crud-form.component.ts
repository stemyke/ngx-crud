import {Component, OnInit} from "@angular/core";
import {FormGroup} from "@angular/forms";
import {HttpErrorResponse} from "@angular/common/http";
import {DynamicFormGroupModel, DynamicFormModel, IDynamicForm} from "@stemy/ngx-dynamic-form";
import {FileUtils, IAsyncMessage, ObjectUtils, ObservableUtils} from "@stemy/ngx-utils";
import {ICrudRouteButtonContext} from "../../common-types";
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
    data: any;
    files: any;

    formGroupModel: DynamicFormGroupModel;
    formModel: DynamicFormModel;
    formGroup: FormGroup;

    ctrInit(): void {
        super.ctrInit();
        this.data = {};
        this.files = {};
    }

    async ngOnInit() {
        this.formGroupModel = await this.forms.getFormGroupModelForSchema(this.requestType, this.settings.customizeFormModel);
        this.formModel = this.formGroupModel.group;
        this.formGroup = this.forms.createFormGroup(this.formModel, {updateOn: "blur"});
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            this.state.subscribe(async () => {
                const btnContext = this.getButtonContext();
                const btn = ObjectUtils.isFunction(this.settings.saveButton)
                    ? this.settings.saveButton(this.injector, "save", btnContext) : this.settings.saveButton;
                this.id = this.state.params.id;
                this.saveButton = !btn ? null : (ObjectUtils.isString(btn) ? btn : "save");
                try {
                    const path = this.endpoint + await this.settings.getRequestPath(
                        this.id, this.settings.primaryRequest, "request", this.injector
                    );
                    const data = await this.api.get(path);
                    this.data = await this.settings.customizeFormData(data, this.injector, this.formModel, this.state.params, this.context) ?? data;
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
                    }
                    await this.navigateBack();
                    return;
                }
                this.forms.patchGroup(this.data, this.formModel, this.formGroup);
                this.cdr.detectChanges();
            }),
        )
    }

    importFile = async (ie: string): Promise<IAsyncMessage> => {
        try {
            const path = this.endpoint + await this.settings.getRequestPath(
                this.id, this.settings.primaryRequest, "import", this.injector, ie
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
            const path = this.endpoint + await this.settings.getRequestPath(
                this.id, this.settings.primaryRequest, "export", this.injector, ie
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
            additionalResources = await this.settings.customizeSerializedData(data, this.injector, this.formModel, this.state.params, this.context);
        } catch (error) {
            throw {
                message: `${error}`
            }
        }
        const action = this.state.data.id;
        try {
            data = ObjectUtils.assign(context, data);
            const path = this.endpoint + await this.settings.getRequestPath(
                this.id, this.settings.primaryRequest, "save", this.injector
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
            const error = ObjectUtils.isObject(res.error) ? res.error.message : res.error;
            throw {
                message: error ? ((error as string).indexOf("Error") > -1 ? `message.${action}.error` : error) : `message.${action}.error`,
                context: {reason: res.error}
            }
        }
    }

    protected getButtonContext(): ICrudRouteButtonContext {
        return {
            ...super.getButtonContext(),
            data: this.data,
        };
    }

    protected async navigateBack(): Promise<void> {
        const path = [this.endpoint];
        let snapshot = this.state.snapshot?.parent;
        while (snapshot) {
            path.unshift(...snapshot.url.map(s => s.path));
            snapshot = snapshot.parent;
        }
        await this.state.navigate(path);
    }
}
