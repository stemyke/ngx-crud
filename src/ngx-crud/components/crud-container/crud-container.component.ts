import {ChangeDetectorRef, Component, ComponentRef, OnDestroy, OnInit, Type, ViewEncapsulation} from "@angular/core";
import {ActivatedRoute, Data, Router, UrlSerializer} from "@angular/router";
import {Subscription} from "rxjs";

import {ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";

@Component({
    standalone: false,
    selector: "crud-container",
    templateUrl: "./crud-container.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudContainerComponent implements OnInit, OnDestroy {

    data: Data;
    settings: ICrudRouteSettings;
    componentRef: ComponentRef<any>;

    get context(): any {
        return {};
    }

    protected subscription: Subscription;

    constructor(protected route: ActivatedRoute,
                protected router: Router,
                protected crud: CrudService,
                protected cdr: ChangeDetectorRef,
                protected urlSerializer: UrlSerializer) {
        this.data = {};
        this.settings = {} as any;
    }

    ngOnInit() {
        this.subscription = this.route.data.subscribe(data => {
            this.data = data;
            this.settings = data.settings as ICrudRouteSettings;
            this.componentRef?.destroy();
            if (!this.settings) return;
            // this.componentType = this.settings.component || this.crud.getComponentType(this.settings.primaryRequest);
            // if (!this.componentType) {
            //     console.log(`Component not defined for: ${this.settings.primaryRequest}`);
            // }
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}
