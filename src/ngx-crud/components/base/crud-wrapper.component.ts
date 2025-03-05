import {ChangeDetectorRef, Component, OnDestroy, OnInit, Type} from "@angular/core";
import {ActivatedRoute, Data, Router, UrlSerializer} from "@angular/router";
import {BehaviorSubject, Subscription} from "rxjs";

import {ICrudOutletState, ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";

export const defaultOutletState = {
    dialog: false,
    isActive: false,
    data: {},
    params: {},
    snapshot: null
} as ICrudOutletState;

@Component({
    standalone: false,
    template: `
        <div class="crud-wrapper">
            <ng-container [ngComponentOutlet]="componentType"></ng-container>
        </div>
    `,
    selector: "crud-wrapper"
})
export class CrudWrapperComponent implements OnInit, OnDestroy {

    data: Data;
    settings: ICrudRouteSettings;
    beforeState: BehaviorSubject<ICrudOutletState>;
    afterState: BehaviorSubject<ICrudOutletState>;
    componentType: Type<any>;
    component: any;

    protected subscription: Subscription;

    constructor(protected route: ActivatedRoute,
                protected router: Router,
                protected crud: CrudService,
                protected cdr: ChangeDetectorRef,
                protected urlSerializer: UrlSerializer) {
        this.data = {};
        this.settings = {} as any;
        this.beforeState = new BehaviorSubject(defaultOutletState);
        this.afterState = new BehaviorSubject(defaultOutletState);
    }

    ngOnInit() {
        this.subscription = this.route.data.subscribe(data => {
            this.data = data;
            this.settings = data.settings as ICrudRouteSettings;
            if (!this.settings) return;
            this.componentType = this.crud.getComponentType(this.settings.primaryRequest);
            if (!this.componentType) {
                console.log(`Component not defined for: ${this.settings.primaryRequest}`);
            }
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}
