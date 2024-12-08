import {Component, OnInit, Type} from "@angular/core";
import {StateService} from "@stemy/ngx-utils";
import {CrudService} from "../../services/crud.service";
import {CrudRouteRequest, ICrudRouteSettings} from "../../common-types";

@Component({
    standalone: false,
    template: `
        HELLO
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
        console.log(this.settings, this.component);
    }
}
