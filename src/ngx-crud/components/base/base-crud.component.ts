import {ChangeDetectorRef, Component, Inject, Injector, OnDestroy, OnInit} from "@angular/core";
import {Subscription} from "rxjs";
import {
    API_SERVICE,
    AUTH_SERVICE, DIALOG_SERVICE,
    EventsService,
    IApiService,
    IAsyncMessage,
    IAuthService, IDialogService,
    ILanguageService,
    IToasterService,
    ObjectUtils,
    ObservableUtils,
    OpenApiService,
    StateService,
    TOASTER_SERVICE
} from "@stemy/ngx-utils";
import {DynamicFormService} from "@stemy/ngx-dynamic-form";

import {
    FILTER_QUERY_NAME,
    ICrudRouteButton,
    ICrudRouteButtonContext,
    ICrudRouteContext,
    ICrudRouteSettings
} from "../../common-types";
import {getRequestType} from "../../utils/route.utils";
import {CrudService} from "../../services/crud.service";

@Component({
    standalone: false,
    template: "",
    selector: "crud-base-component"
})
export class BaseCrudComponent implements OnInit, OnDestroy {

    buttons: ICrudRouteButton[];

    protected subscription: Subscription;

    get language(): ILanguageService {
        return this.api.language;
    }

    get openApi(): OpenApiService {
        return this.forms.openApi;
    }

    get settings(): ICrudRouteSettings {
        return this.state.data.settings;
    }

    get requestType(): string {
        return !this.settings ? "" : getRequestType(this.settings.requestType, this.settings.primaryRequest);
    }

    get endpoint(): string {
        const params = this.state.params || {};
        return Object.entries(params).reduce((ep, [key, value]) => {
            return ep.replace(`/:${key}`, `/${value}`);
        }, this.settings.endpoint);
    }

    get context(): ICrudRouteContext {
        return this.state.data.context;
    }

    constructor(readonly cdr: ChangeDetectorRef,
                readonly state: StateService,
                readonly injector: Injector,
                readonly forms: DynamicFormService,
                readonly events: EventsService,
                readonly crud: CrudService,
                @Inject(DIALOG_SERVICE) readonly dialog: IDialogService,
                @Inject(API_SERVICE) readonly api: IApiService,
                @Inject(AUTH_SERVICE) readonly auth: IAuthService,
                @Inject(TOASTER_SERVICE) readonly toaster: IToasterService,
                @Inject(FILTER_QUERY_NAME) protected filterName: string) {
    }

    ngOnInit(): void {
        this.subscription = ObservableUtils.multiSubscription(
            this.auth.userChanged.subscribe(() => this.generateButtons())
        );
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    callButton = async (context: ICrudRouteButton): Promise<IAsyncMessage> => {
        try {
            const message = context.function(this.injector, context.button, this.getButtonContext()) as any;
            if (ObjectUtils.isObject(message) && message?.message) {
                return message;
            }
            return null;
        } catch (e) {
            const msg = `message.${this.settings.id}-${context.button}.error`;
            throw {
                message: `${e.message || msg}`,
                context: {reason: e}
            };
        }
    }

    protected getButtonContext(): ICrudRouteButtonContext {
        return {
            context: this.context,
            params: this.state.params,
            endpoint: this.endpoint
        };
    }

    protected generateButtons(): void {
        if (!this.settings) return;
        this.buttons = this.settings.customButtons?.filter(b => {
            if (ObjectUtils.isFunction(b.hidden)) {
                return !b.hidden(this.injector, b.button, this.getButtonContext());
            }
            return b.hidden !== true;
        }) || [];
    }
}
