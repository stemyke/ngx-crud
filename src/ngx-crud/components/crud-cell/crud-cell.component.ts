import {ChangeDetectorRef, Component, Inject, Input, OnChanges, OnDestroy, OnInit, TemplateRef} from "@angular/core";
import {Subscription} from "rxjs";
import {
    GlobalTemplateService,
    IOpenApiSchemaProperty,
    ITimer,
    ILanguageService,
    TimerUtils,
    LANGUAGE_SERVICE
} from "@stemy/ngx-utils";

import {ICrudList} from "../../common-types";

@Component({
    standalone: false,
    selector: "base-crud-cell",
    styleUrls: ["./crud-cell.component.scss"],
    templateUrl: "./crud-cell.component.html"
})
export class CrudCellComponent implements OnInit, OnChanges, OnDestroy {

    @Input() value: any;
    @Input() item: {[col: string]: any};
    @Input() list: ICrudList;
    @Input() id: string;
    @Input() property: IOpenApiSchemaProperty;

    multi: boolean;
    template: TemplateRef<any>;

    protected updateTimer: ITimer;
    protected listener: Subscription;

    get dateFormat(): string {
        switch (this.language.currentLanguage) {
            case "de":
                return "dd.MM.yyyy - HH:mm";
        }
        return "MM/dd/yyyy - HH:mm";
    }

    constructor(readonly cdr: ChangeDetectorRef,
                readonly globalTemplates: GlobalTemplateService,
                @Inject(LANGUAGE_SERVICE) readonly language: ILanguageService) {
        this.multi = false;
        this.updateTimer = TimerUtils.createTimeout();
        this.listener = null;
    }

    ngOnInit(): void {
        this.listener = this.globalTemplates.templatesUpdated.subscribe(() => {
            this.updateTemplate();
        });
    }

    ngOnChanges() {
        this.multi = Array.isArray(this.value);
        this.updateTemplate();
    }

    ngOnDestroy(): void {
        this.listener?.unsubscribe();
    }

    protected updateTemplate(): void {
        this.template = this.globalTemplates.get(`crud-col-${this.id}`);
        this.cdr.detectChanges();
    }
}
