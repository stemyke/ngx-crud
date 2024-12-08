import {ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {NgxUtilsModule} from "@stemy/ngx-utils";

import {
    ACTION_ICONS,
    COMPONENT_TYPES,
    CrudActionIcons,
    FILTER_QUERY_NAME,
    ICrudComponentTypes,
    ICrudModuleConfig
} from "./common-types";
import {ContextResolverService} from "./services/context-resolver.service";
import {CrudService} from "./services/crud.service";
import {components, directives, pipes} from "./ngx-crud.imports";
import {CrudListComponent} from "./components/crud-list/crud-list.component";
import {CrudCellComponent} from "./components/crud-cell/crud-cell.component";
import {CrudFormComponent} from "./components/crud-form/crud-form.component";

@NgModule({
    declarations: [
        ...components,
        ...directives,
        ...pipes
    ],
    imports: [
        CommonModule,
        FormsModule,
        NgxUtilsModule
    ],
    exports: [
        ...components,
        ...directives,
        ...pipes,
        FormsModule,
        NgxUtilsModule
    ],
    providers: [
        ...pipes
    ]
})
export class NgxCrudModule {

    static forRoot(config?: ICrudModuleConfig): ModuleWithProviders<NgxCrudModule> {
        return {
            ngModule: NgxCrudModule,
            providers: [
                CrudService,
                ContextResolverService,
                {
                    provide: FILTER_QUERY_NAME,
                    useValue: (config?.filterName || "filter")
                },
                {
                    provide: COMPONENT_TYPES,
                    useValue: Object.assign({
                        list: CrudListComponent,
                        add: CrudFormComponent,
                        edit: CrudFormComponent,
                        cell: CrudCellComponent,
                    } as ICrudComponentTypes, config?.componentTypes || {})
                },
                {
                    provide: ACTION_ICONS,
                    useValue: Object.assign({
                        view: "visibility",
                        edit: "edit",
                        delete: "delete"
                    } as CrudActionIcons, config?.actionIcons || {})
                }
            ]
        }
    }
}
