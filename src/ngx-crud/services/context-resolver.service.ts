import {Injectable, Injector} from "@angular/core";
import {ActivatedRouteSnapshot, Resolve} from "@angular/router";
import {ICrudRouteContext, ICrudRouteSettings} from "../common-types";

@Injectable()
export class ContextResolverService implements Resolve<ICrudRouteContext> {
    constructor(protected injector: Injector) {

    }

    async resolve(snapshot: ActivatedRouteSnapshot): Promise<ICrudRouteContext> {
        const settings = snapshot.data.settings as ICrudRouteSettings;
        const context = {
            snapshot,
            routeData: snapshot.data,
            params: snapshot.params
        } as ICrudRouteContext;
        return await settings.loadContext(context, this.injector) ?? context;
    }
}
