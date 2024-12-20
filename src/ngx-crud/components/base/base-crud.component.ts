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
    ICrudRouteActionContext,
    ICrudRouteContext,
    ICrudRouteSettings
} from "../../common-types";
import {getRequestType} from "../../utils/route.utils";
import {CrudService} from "../../services/crud.service";
import {selectBtnProp} from "../../utils/crud.utils";

@Component({
    standalone: false,
    template: "",
    selector: "crud-base-component"
})
export class BaseCrudComponent implements OnInit, OnDestroy {

    context: ICrudRouteContext;
    buttons: ICrudRouteButton<string>[];

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
        this.context = this.state.data.context;
        this.subscription = ObservableUtils.multiSubscription(
            this.auth.userChanged.subscribe(() => this.generateButtons())
        );
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    callButton = async (context: ICrudRouteButton): Promise<IAsyncMessage> => {
        try {
            const message = await context.function(this.injector, context.button, this.getActionContext()) as IAsyncMessage;
            this.generateButtons();
            return ObjectUtils.isObject(message) && message?.message
                ? message: null;
        } catch (e) {
            const msg = `message.${this.settings.id}-${context.button}.error`;
            throw {
                message: `${e.message || msg}`,
                context: {reason: e}
            };
        }
    }

    protected getActionContext(): ICrudRouteActionContext {
        return {
            params: this.state.params,
            routeData: this.state.data,
            injector: this.injector,
            context: this.context,
            endpoint: this.endpoint,
            page: {total: 0, items: []},
            entity: {}
        };
    }

    protected generateButtons(): void {
        if (!this.settings) return;
        const actionCtx = this.getActionContext();
        this.buttons = this.settings.customButtons?.filter(btn => {
            if (ObjectUtils.isFunction(btn.hidden)) {
                return !btn.hidden(actionCtx, btn.button);
            }
            return btn.hidden !== true;
        }).map(btn => {
            const res = {...btn} as ICrudRouteButton<string>;
            res.icon = selectBtnProp(btn.icon, actionCtx, btn.button, "");
            return res;
        }) || [];
    }
}
