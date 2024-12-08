import {Component, OnInit, Type} from "@angular/core";
import {StateService} from "@stemy/ngx-utils";
import {CrudService} from "../../services/crud.service";
import {ICrudRouteSettings} from "../../common-types";

@Component({
    standalone: false,
    template: `
        <ng-container [ngComponentOutlet]="component"></ng-container>
    `,
    selector: "crud-wrapper"
})
export class CrudWrapperComponent implements OnInit {

    component: Type<any>;

    get settings(): ICrudRouteSettings {
        return this.state.data.settings;
    }

    constructor(protected state: StateService, protected crud: CrudService) {

    }

    ngOnInit() {
        this.component = this.crud.getComponentType(this.settings.primaryRequest);
        if (!this.component) {
            console.log(`Component not defined for: ${this.settings.primaryRequest}`);
        }
    }
}
