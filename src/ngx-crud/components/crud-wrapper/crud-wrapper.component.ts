import {ChangeDetectorRef, Component, Input, OnDestroy, OnInit, Type, ViewEncapsulation} from "@angular/core";
import {ActivatedRoute, Data, Router, UrlSerializer} from "@angular/router";
import {BehaviorSubject, Subscription} from "rxjs";

import {CrudOutletState, ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";

export const defaultOutletState = {
    dialog: false,
    isActive: false,
    data: {},
    params: {},
    snapshot: null,
    page: "",
    links: []
} as CrudOutletState;

@Component({
    standalone: false,
    encapsulation: ViewEncapsulation.None,
    templateUrl: "./crud-wrapper.component.html",
    styleUrls: ["./crud-wrapper.component.scss"],
    selector: "crud-wrapper"
})
export class CrudWrapperComponent implements OnInit, OnDestroy {

    data: Data;
    componentType: Type<any>;
    componentInputs: Record<string, any>;
    beforeState: BehaviorSubject<CrudOutletState>;
    afterState: BehaviorSubject<CrudOutletState>;
    component: any;

    protected subscription: Subscription;
    protected routeSettings: ICrudRouteSettings;

    @Input()
    set settings(value: ICrudRouteSettings) {
        this.routeSettings = value;
        this.updateComponent();
    }

    get settings(): ICrudRouteSettings {
        return this.routeSettings || this.data.settings;
    }

    constructor(protected route: ActivatedRoute,
                protected router: Router,
                protected crud: CrudService,
                protected cdr: ChangeDetectorRef,
                protected urlSerializer: UrlSerializer) {
        this.data = {};
        this.beforeState = new BehaviorSubject(defaultOutletState);
        this.afterState = new BehaviorSubject(defaultOutletState);
    }

    ngOnInit() {
        this.subscription = this.route.data.subscribe(data => {
            this.data = data;
            this.updateComponent();
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    protected updateComponent(): void {
        this.componentType = this.settings?.container || this.crud.getComponentType("container");
        this.componentInputs = {
            data: this.data,
            settings: this.settings,
        };
    }
}
