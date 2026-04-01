import {Component, Inject, Input, OnChanges, ViewEncapsulation} from "@angular/core";
import {ILanguageService, LANGUAGE_SERVICE, OpenApiSchemaProperty} from "@stemy/ngx-utils";

import {ICrudList} from "../../common-types";

@Component({
    standalone: false,
    selector: "crud-cell",
    styleUrls: ["./crud-cell.component.scss"],
    templateUrl: "./crud-cell.component.html",
    encapsulation: ViewEncapsulation.None
})
export class CrudCellComponent implements OnChanges {

    @Input() value: any;
    @Input() item: Record<string, any>;
    @Input() list: ICrudList;
    @Input() id: string;
    @Input() property: OpenApiSchemaProperty;

    multi: boolean;

    get dateFormat(): string {
        switch (this.language.currentLanguage) {
            case "de":
                return "dd.MM.yyyy - HH:mm";
        }
        return "MM/dd/yyyy - HH:mm";
    }

    constructor(@Inject(LANGUAGE_SERVICE) readonly language: ILanguageService) {
        this.multi = false;
    }

    ngOnChanges() {
        this.multi = Array.isArray(this.value);
    }
}
