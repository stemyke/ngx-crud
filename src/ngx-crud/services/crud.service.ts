import {Inject, Injectable, Injector, Optional, Type} from "@angular/core";
import {ActivatedRouteSnapshot, CanDeactivate, ChildrenOutletContexts} from "@angular/router";
import {COMPONENT_TYPES, ICrudComponent, ICrudComponentTypes, ICrudRouteSettings, ICrudTreeItem} from "../common-types";

@Injectable()
export class CrudService implements CanDeactivate<any> {

    constructor(readonly injector: Injector,
                @Inject(COMPONENT_TYPES) readonly componentTypes: ICrudComponentTypes,
                @Optional() readonly contexts: ChildrenOutletContexts = null) {
    }

    getComponentType(type: keyof ICrudComponentTypes): Type<any> {
        return this.componentTypes[type];
    }

    getTree(snapshot: ActivatedRouteSnapshot): ICrudTreeItem[] {
        let contexts = this.contexts;
        return snapshot.pathFromRoot.map((snapshot, ix) => {
            let component: any = null;
            // We skip the first ix because it's the root snapshot,
            // and even if we have a component Type for it, we cant retrieve the instance from the ChildrenOutletContexts
            if (snapshot.component && contexts && ix > 0) {
                const context = contexts.getContext(snapshot.outlet);
                contexts = context?.children;
                component = context?.outlet?.component as any;
            }
            return {
                snapshot,
                component: component?.component || component || null
            };
        });
    }

    async canDeactivate(_, snapshot: ActivatedRouteSnapshot) {
        const settings = snapshot.data.settings as ICrudRouteSettings;
        if (!settings || !settings.onLeave) return true;
        const tree = this.getTree(snapshot);
        const component = tree[tree.length - 1]?.component as ICrudComponent;
        return settings.onLeave(component.getActionContext(), tree);
    }
}
