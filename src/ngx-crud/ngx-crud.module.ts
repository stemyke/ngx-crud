import {EnvironmentProviders, makeEnvironmentProviders, ModuleWithProviders, NgModule, Provider} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {RouterModule} from "@angular/router";
import {NgxUtilsModule} from "@stemy/ngx-utils";
import {NgxDynamicFormModule} from "@stemy/ngx-dynamic-form";

import {
    ACTIONS_COLUMN_TITLE,
    COMPONENT_TYPES,
    FILTER_PARAM_NAME,
    ICrudComponentTypes,
    ICrudModuleConfig,
    QUERY_PARAM_NAME,
} from "./common-types";
import {ContextResolverService} from "./services/context-resolver.service";
import {CrudService} from "./services/crud.service";
import {components, directives, pipes} from "./ngx-crud.imports";
import {CrudCellComponent} from "./components/crud-cell/crud-cell.component";
import {CrudListComponent} from "./components/crud-list/crud-list.component";
import {CrudFormComponent} from "./components/crud-form/crud-form.component";
import {CrudContainerComponent} from "./components/crud-container/crud-container.component";

@NgModule({
    declarations: [
        ...components,
        ...directives,
        ...pipes
    ],
    imports: [
        CommonModule,
        FormsModule,
        NgxUtilsModule,
        NgxDynamicFormModule,
        RouterModule
    ],
    exports: [
        ...components,
        ...directives,
        ...pipes,
        FormsModule,
        NgxUtilsModule,
        NgxDynamicFormModule
    ],
    providers: [
        ...pipes
    ]
})
export class NgxCrudModule {

    private static getProviders(config?: ICrudModuleConfig): Provider[] {
        return [
            CrudService,
            ContextResolverService,
            {
                provide: FILTER_PARAM_NAME,
                useValue: (config?.filterParamName || "filter")
            },
            {
                provide: QUERY_PARAM_NAME,
                useValue: (config?.queryParamName || "query")
            },
            {
                provide: COMPONENT_TYPES,
                useValue: Object.assign({
                    list: CrudListComponent,
                    add: CrudFormComponent,
                    edit: CrudFormComponent,
                    view: CrudFormComponent,
                    cell: CrudCellComponent,
                    container: CrudContainerComponent,
                } as ICrudComponentTypes, config?.componentTypes || {})
            },
            {
                provide: ACTIONS_COLUMN_TITLE,
                useValue: config?.actionsTitle || " "
            }
        ];
    }

    static forRoot(config?: ICrudModuleConfig): ModuleWithProviders<NgxCrudModule> {
        return {
            ngModule: NgxCrudModule,
            providers: NgxCrudModule.getProviders(config)
        }
    }

    static provideCrud(config?: ICrudModuleConfig): EnvironmentProviders {
        return makeEnvironmentProviders(NgxCrudModule.getProviders(config));
    }
}
