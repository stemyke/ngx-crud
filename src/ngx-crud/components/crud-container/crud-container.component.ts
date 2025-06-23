import {
    ApplicationRef,
    Component,
    ComponentRef,
    createComponent,
    EnvironmentInjector, Injector,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation
} from "@angular/core";
import {ActivatedRoute, Data, Router, UrlSerializer} from "@angular/router";
import {Subscription} from "rxjs";

import {ICrudComponent, ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";

@Component({
    standalone: false,
    selector: "crud-container",
    templateUrl: "./crud-container.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudContainerComponent implements OnInit, OnDestroy {

    @ViewChild('header', { read: ViewContainerRef, static: true }) header: ViewContainerRef;
    @ViewChild('content', { read: ViewContainerRef, static: true }) content: ViewContainerRef;
    @ViewChild('footer', { read: ViewContainerRef, static: true }) footer: ViewContainerRef;

    data: Data;
    settings: ICrudRouteSettings;
    componentRef: ComponentRef<any>;

    get context(): any {
        return {};
    }

    protected subscription: Subscription;

    constructor(protected readonly route: ActivatedRoute,
                protected readonly router: Router,
                protected readonly crud: CrudService,
                protected readonly injector: Injector,
                protected readonly appRef: ApplicationRef) {
        this.data = {};
        this.settings = {} as any;
    }

    ngOnInit() {
        this.subscription = this.route.data.subscribe(data => {
            this.detach();
            this.data = data;
            this.settings = data.settings as ICrudRouteSettings;
            if (!this.settings) return;
            const type = this.settings.component || this.crud.getComponentType(this.settings.primaryRequest);
            if (!type) {
                console.log(`Component not defined for: ${this.settings.primaryRequest}`);
                return;
            }
            this.componentRef = createComponent(type, {
                environmentInjector: this.appRef.injector,
                elementInjector: this.injector
            });
            this.appRef.attachView(this.componentRef.hostView);
            this.attach(this.componentRef.instance);
        });
    }

    attach(component: ICrudComponent) {
        if (component.header) {
            this.header?.createEmbeddedView(component.header);
        }
        if (component.content) {
            this.content?.createEmbeddedView(component.content);
        }
        if (component.footer) {
            this.footer?.createEmbeddedView(component.footer);
        }
    }

    detach(): void {
        this.header?.clear();
        this.content?.clear();
        this.footer?.clear();
        if (!this.componentRef) return;
        this.appRef.detachView(this.componentRef.hostView);
        this.componentRef.destroy();
        this.componentRef = null;
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
        this.detach();
    }
}
