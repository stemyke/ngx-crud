import {Component, OnDestroy, OnInit, Type} from "@angular/core";
import {Subscription} from "rxjs";

import {ICrudRouteSettings} from "../../common-types";
import {CrudService} from "../../services/crud.service";
import {ActivatedRoute} from "@angular/router";

@Component({
    standalone: false,
    template: `<ng-container [ngComponentOutlet]="component"></ng-container>`,
    selector: "crud-wrapper"
})
export class CrudWrapperComponent implements OnInit, OnDestroy {

    component: Type<any>;

    protected subscription: Subscription;

    constructor(protected route: ActivatedRoute, protected crud: CrudService) {

    }

    ngOnInit() {
        this.subscription = this.route.data.subscribe(data => {
            const settings = data.settings as ICrudRouteSettings;
            if (!settings) return;
            this.component = this.crud.getComponentType(settings.primaryRequest);
            if (!this.component) {
                console.log(`Component not defined for: ${settings.primaryRequest}`);
            }
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}
