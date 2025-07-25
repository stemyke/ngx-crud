import {
    ChangeDetectorRef,
    Component,
    Inject,
    Injector,
    OnDestroy,
    OnInit,
    Optional,
    TemplateRef,
    ViewChild,
    ViewEncapsulation
} from "@angular/core";
import {ActivatedRoute, ActivatedRouteSnapshot, Router} from "@angular/router";
import {Subscription} from "rxjs";
import {
    API_SERVICE,
    AUTH_SERVICE,
    DIALOG_SERVICE,
    EventsService,
    HttpRequestOptions,
    IApiService,
    IAsyncMessage,
    IAuthService,
    IDialogService,
    ILanguageService,
    IToasterService,
    ObjectUtils,
    OpenApiService,
    StringUtils,
    TOASTER_SERVICE
} from "@stemy/ngx-utils";
import {DynamicFormService} from "@stemy/ngx-dynamic-form";

import {
    ACTIONS_COLUMN_TITLE,
    CrudRouteMethod,
    CrudRouteRequest,
    CrudTreeItem,
    FILTER_PARAM_NAME,
    ICrudComponent,
    ICrudRouteActionContext,
    ICrudRouteButton,
    ICrudRouteContext,
    ICrudRouteSettings,
    QUERY_PARAM_NAME
} from "../../common-types";
import {selectBtnProp} from "../../utils/crud.utils";
import {CrudService} from "../../services/crud.service";
import {CrudWrapperComponent} from "../crud-wrapper/crud-wrapper.component";

@Component({
    standalone: false,
    template: "",
    selector: "crud-base-component",
    encapsulation: ViewEncapsulation.None
})
export class BaseCrudComponent implements ICrudComponent, OnInit, OnDestroy {

    context: ICrudRouteContext;
    buttons: ICrudRouteButton<string>[];

    @ViewChild("header", {read: TemplateRef, static: true}) header: TemplateRef<any>;
    @ViewChild("content", {read: TemplateRef, static: true}) content: TemplateRef<any>;
    @ViewChild("footer", {read: TemplateRef, static: true}) footer: TemplateRef<any>;

    protected subscription: Subscription;

    get snapshot(): ActivatedRouteSnapshot {
        return this.route.snapshot;
    }

    get language(): ILanguageService {
        return this.api.language;
    }

    get settings(): ICrudRouteSettings {
        return this.snapshot.data.settings;
    }

    get endpoint(): string {
        const params = this.snapshot.pathFromRoot.reduce((res, s) => {
            return Object.assign(res, s.params || {});
        }, {}) as Record<string, any>;
        return Object.entries(params).reduce((ep, [key, value]) => {
            return ep.replace(`/:${key}`, `/${value}`);
        }, this.settings.endpoint);
    }

    constructor(readonly cdr: ChangeDetectorRef,
                readonly route: ActivatedRoute,
                readonly router: Router,
                readonly injector: Injector,
                readonly openApi: OpenApiService,
                readonly forms: DynamicFormService,
                readonly events: EventsService,
                readonly crud: CrudService,
                @Inject(DIALOG_SERVICE) readonly dialog: IDialogService,
                @Inject(API_SERVICE) readonly api: IApiService,
                @Inject(AUTH_SERVICE) readonly auth: IAuthService,
                @Inject(TOASTER_SERVICE) readonly toaster: IToasterService,
                @Inject(FILTER_PARAM_NAME) protected filterParamName: string,
                @Inject(QUERY_PARAM_NAME) protected queryParamName: string,
                @Inject(ACTIONS_COLUMN_TITLE) protected actionsTitle: string,
                @Optional() protected wrapper: CrudWrapperComponent) {
    }

    ngOnInit(): void {
        this.context = this.snapshot.data.context;
        this.subscription = this.events.userChanged
            .subscribe(() => this.generateButtons());
        if (!this.wrapper) return;
        this.wrapper.component = this;
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    callButton = async (context: ICrudRouteButton): Promise<IAsyncMessage> => {
        try {
            const message = await context.function(this.getActionContext(), null, context.button) as IAsyncMessage;
            this.generateButtons();
            return ObjectUtils.isObject(message) && message?.message
                ? message : null;
        } catch (e) {
            const msg = `message.${this.settings.id}-${context.button}.error`;
            throw {
                message: `${e.message || msg}`,
                context: {reason: e}
            };
        }
    }

    getActionContext(): ICrudRouteActionContext {
        const snapshot = this.snapshot;
        return {
            snapshot,
            params: snapshot.params,
            routeData: snapshot.data,
            injector: this.injector,
            context: this.context,
            endpoint: this.endpoint,
            page: {total: 0, items: []},
            entity: {},
            onLeave: tree => this.onLeave(tree)
        };
    }

    getRequestPath(context: ICrudRouteActionContext, reqType: CrudRouteRequest, method: CrudRouteMethod, importExport?: string): [url: string, options: HttpRequestOptions] {
        const path = this.settings.getRequestPath(context, reqType, method, importExport);
        if (!path || ObjectUtils.isString(path)) {
            return [String(path || ""), {params: {}}];
        }
        const url = path.url || "";
        const options = path.options || {};
        options.params = Object.assign(options.params || {}, path.params || {});
        return [url, options];
    }

    protected async onLeave(tree: CrudTreeItem[]): Promise<boolean> {
        return true;
    }

    protected generateButtons(): void {
        if (!this.settings) return;
        const actionCtx = this.getActionContext();
        this.buttons = this.settings.customButtons?.filter(btn => {
            if (ObjectUtils.isFunction(btn.hidden)) {
                return !btn.hidden(actionCtx, null, btn.button);
            }
            return btn.hidden !== true;
        }).map(btn => {
            const res = {...btn} as ICrudRouteButton<string>;
            res.icon = selectBtnProp(btn.icon, actionCtx, btn.button, "");
            res.type = res.type || "secondary";
            res.testId = res.testId || StringUtils.camelize(`${btn.button}-button`);
            return res;
        }) || [];
    }
}
