import {
    ApplicationRef,
    Component,
    ComponentRef,
    createComponent,
    Injector, Input,
    OnDestroy,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation
} from "@angular/core";
import {Data, Router} from "@angular/router";
import {createTypedProvider} from "@stemy/ngx-utils";

import {CRUD_API_SERVICE, ICrudComponent, ICrudContainerComponent, ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";

@Component({
    standalone: false,
    selector: "crud-container",
    templateUrl: "./crud-container.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudContainerComponent implements OnDestroy, ICrudContainerComponent {

    @Input() data: Data;

    @Input()
    set settings(value: ICrudRouteSettings) {
        this.routeSettings = value;
        this.detach();
        if (!value) return;
        const type = value.component || this.crud.getComponentType(value.primaryRequest);
        if (!type) {
            console.log(`Component not defined for: ${value.primaryRequest}`);
            return;
        }
        this.componentRef = createComponent(type, {
            environmentInjector: this.appRef.injector,
            elementInjector: Injector.create({
                providers: [
                    createTypedProvider(CRUD_API_SERVICE, value.api)
                ],
                parent: this.injector,
            })
        });
        this.componentRef.instance.settings = value;
        this.appRef.attachView(this.componentRef.hostView);
        this.attach(this.componentRef.instance);
    }

    get settings(): ICrudRouteSettings {
        return this.routeSettings;
    }

    get context(): any {
        return {};
    }

    @ViewChild("header", {read: ViewContainerRef, static: true})
    protected header: ViewContainerRef;
    @ViewChild("content", {read: ViewContainerRef, static: true})
    protected content: ViewContainerRef;
    @ViewChild("footer", {read: ViewContainerRef, static: true})
    protected footer: ViewContainerRef;

    protected routeSettings: ICrudRouteSettings;
    protected componentRef: ComponentRef<ICrudComponent>;

    constructor(protected readonly router: Router,
                protected readonly crud: CrudService,
                protected readonly injector: Injector,
                protected readonly appRef: ApplicationRef) {
        this.data = {};
    }

    ngOnDestroy() {
        this.detach();
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
}
