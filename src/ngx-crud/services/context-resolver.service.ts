import {Injectable, Injector} from "@angular/core";
import {ActivatedRouteSnapshot, Resolve} from "@angular/router";
import {ICrudRouteContext, ICrudRouteSettings} from "../common-types";

@Injectable()
export class ContextResolverService implements Resolve<ICrudRouteContext> {
    constructor(protected injector: Injector) {

    }

    async resolve(route: ActivatedRouteSnapshot): Promise<ICrudRouteContext> {
        const settings = route.data.settings as ICrudRouteSettings;
        const context = {
            data: route.data,
            params: route.params
        } as ICrudRouteContext;
        return await settings.loadContext(this.injector, context) ?? context;
    }
}
