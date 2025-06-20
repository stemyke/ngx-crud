import {ChangeDetectorRef, Component, OnDestroy, OnInit, Type, ViewEncapsulation} from "@angular/core";
import {ActivatedRoute, Data, Router, UrlSerializer} from "@angular/router";
import {BehaviorSubject, Subscription} from "rxjs";

import {ICrudOutletState, ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";

export const defaultOutletState = {
    dialog: false,
    isActive: false,
    data: {},
    params: {},
    snapshot: null,
    page: "",
    links: []
} as ICrudOutletState;

@Component({
    standalone: false,
    encapsulation: ViewEncapsulation.None,
    templateUrl: "./crud-wrapper.component.html",
    styleUrls: ["./crud-wrapper.component.scss"],
    selector: "crud-wrapper"
})
export class CrudWrapperComponent implements OnInit, OnDestroy {

    data: Data;
    settings: ICrudRouteSettings;
    componentType: Type<any>;
    beforeState: BehaviorSubject<ICrudOutletState>;
    afterState: BehaviorSubject<ICrudOutletState>;
    component: any;

    protected subscription: Subscription;

    constructor(protected route: ActivatedRoute,
                protected router: Router,
                protected crud: CrudService,
                protected cdr: ChangeDetectorRef,
                protected urlSerializer: UrlSerializer) {
        this.data = {};
        this.settings = {} as any;
        this.componentType = this.crud.getComponentType("container");
        this.beforeState = new BehaviorSubject(defaultOutletState);
        this.afterState = new BehaviorSubject(defaultOutletState);
    }

    ngOnInit() {
        this.subscription = this.route.data.subscribe(data => {
            this.data = data;
            this.settings = data.settings as ICrudRouteSettings;
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}
