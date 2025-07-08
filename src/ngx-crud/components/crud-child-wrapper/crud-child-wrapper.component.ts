import {AfterViewInit, Component, ViewChild, ViewEncapsulation} from "@angular/core";
import {RouterOutlet} from "@angular/router";
import {IRoute, ObservableUtils} from "@stemy/ngx-utils";
import {Subscription} from "rxjs";

import {CrudOutletState, CrudRouteLink} from "../../common-types";
import {checkIsDialog, getSnapshotPath, getSnapshotTree} from "../../utils/route.utils";
import {CrudWrapperComponent, defaultOutletState} from "../crud-wrapper/crud-wrapper.component";

@Component({
    standalone: false,
    templateUrl: "./crud-child-wrapper.component.html",
    styleUrls: ["./crud-child-wrapper.component.scss"],
    selector: "crud-child-wrapper",
    encapsulation: ViewEncapsulation.None,
    providers: [
        {provide: CrudWrapperComponent, useExisting: CrudChildWrapperComponent}
    ]
})
export class CrudChildWrapperComponent extends CrudWrapperComponent implements AfterViewInit {

    @ViewChild("before")
    before: RouterOutlet;

    @ViewChild("after")
    after: RouterOutlet;

    protected beforeSub: Subscription;

    protected afterSub: Subscription;

    protected closeTarget: EventTarget;

    get showMain(): boolean {
        return !this.settings || !this.settings.hideMain || (!this.beforeState.value.isActive && !this.afterState.value.isActive);
    }

    ngAfterViewInit() {
        this.subscription = ObservableUtils.multiSubscription(
            this.subscription,
            ObservableUtils.subscribe(
                {
                    subjects: [this.before.activateEvents, this.before.deactivateEvents],
                    cb: () => {
                        const state = this.getState(this.before);
                        this.beforeSub?.unsubscribe();
                        if (state.isActive) {
                            this.beforeSub = ObservableUtils.subscribe({
                                subjects: [this.before.activatedRoute.data, this.before.activatedRoute.params],
                                cb: () => {
                                    const state = this.getState(this.before);
                                    this.beforeState.next(state);
                                    this.cdr.detectChanges();
                                }
                            });
                        }
                        this.beforeState.next(state);
                        this.cdr.detectChanges();
                    }
                },
                {
                    subjects: [this.after.activateEvents, this.after.deactivateEvents],
                    cb: () => {
                        const state = this.getState(this.after);
                        this.afterSub?.unsubscribe();
                        if (state.isActive) {
                            this.afterSub = ObservableUtils.subscribe({
                                subjects: [this.after.activatedRoute.data, this.after.activatedRoute.params],
                                cb: () => {
                                    const state = this.getState(this.after);
                                    this.afterState.next(state);
                                    this.cdr.detectChanges();
                                }
                            });
                        }
                        this.afterState.next(state);
                        this.cdr.detectChanges();
                    }
                }
            )
        );
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.beforeSub?.unsubscribe();
        this.afterSub?.unsubscribe();
    }

    getState(outlet: RouterOutlet): CrudOutletState {

        if (!outlet) return defaultOutletState;

        const settings = this.settings;
        const snapshot = this.route.snapshot;
        const children = (this.data?.children || []) as IRoute[];
        const links = settings?.useTabs ? children.filter(r => r.outlet === outlet.name && r.data?.name).map(r => {
            return {
                value: r.data.page,
                label: r.data.name,
                path: getSnapshotTree(snapshot, [{outlets: {[outlet.name]: r.path}}]),
                data: r.data
            } as CrudRouteLink;
        }) : [];
        const main: CrudRouteLink = links.length && settings.hideMain && this.data
            ? {
                value: this.data.page,
                label: 'menu.' + this.data.id,
                path: getSnapshotTree(snapshot, []),
                data: this.data
            }
            : null;

        if (!outlet.isActivated) {
            if (main) {
                links.unshift(main);
            }
            return {
                ...defaultOutletState,
                links
            }
        }

        const activatedSnapshot = outlet.activatedRoute.snapshot;
        const {data, params} = activatedSnapshot;

        if (main) {
            links.unshift(main);
        }

        return {
            dialog: checkIsDialog(this.route.snapshot) && outlet.component && !outlet.activatedRouteData.empty,
            isActive: true,
            data: data || {},
            params: params || {},
            snapshot: outlet.activatedRoute.snapshot,
            page: data?.page || "",
            links
        };
    }

    beforeClose(event: MouseEvent): void {
        this.closeTarget = event.target;
    }

    close(outlet: RouterOutlet, event: MouseEvent): boolean {
        if (!outlet.isActivated || !checkIsDialog(this.route.snapshot) || event.target !== this.closeTarget) return true;
        const closeElem = this.findCloseElement(event.target);
        if (!closeElem) return true;
        event.preventDefault();
        const url = getSnapshotPath(outlet.activatedRoute.snapshot, this.urlSerializer, "", true);
        this.router.navigateByUrl(url);
        return true;
    }

    navigate(link: CrudRouteLink): void {
        this.router.navigateByUrl(link.path);
    }

    protected findCloseElement(target: EventTarget): HTMLElement {
        if (target instanceof HTMLElement) {
            if (target.classList.contains('child-content')) {
                return null;
            }
            if (target.classList.contains('child-wrapper') || target.classList.contains('child-close-btn')) {
                return target;
            }
            return this.findCloseElement(target.parentElement);
        }
        return null;
    }
}
