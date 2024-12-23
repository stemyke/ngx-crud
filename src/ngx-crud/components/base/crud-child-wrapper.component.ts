import {Component} from "@angular/core";
import {CrudWrapperComponent} from "./crud-wrapper.component";

@Component({
    standalone: false,
    template: `
        <router-outlet name="before"></router-outlet>
        <ng-container [ngComponentOutlet]="component"></ng-container>
        <router-outlet name="after"></router-outlet>
    `,
    selector: "crud-child-wrapper"
})
export class CrudChildWrapperComponent extends CrudWrapperComponent {

}
