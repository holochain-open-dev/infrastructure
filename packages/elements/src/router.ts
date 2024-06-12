import {
	Router as NativeRouter,
	Routes as NativeRoutes,
} from '@lit-labs/router';

export type {
	BaseRouteConfig,
	PathRouteConfig,
	RouteConfig,
	RoutesConnectedEvent,
	URLPatternRouteConfig,
} from '@lit-labs/router';

export class Routes extends NativeRoutes {
	goto(pathname: string): Promise<void> {
		window.history.pushState(null, '', super.link(pathname));
		return super.goto(pathname);
	}
	currentPathname() {
		const prefix = this.link('');
		const pathname = window.location.pathname;

		if (prefix === '') return pathname;

		return pathname.split(prefix)[1];
	}

	// Goes back, and if there is no page saved in the history of the app,
	// goes back up to the root of the previous level of the pathname
	pop(parentPath: string = '') {
		const previousPathname = this.currentPathname();
		window.history.back();

		setTimeout(() => {
			if (this.currentPathname() === previousPathname) {
				this.goto(this.link(parentPath));
			}
		});
	}
}

export class Router extends NativeRouter {
	goto(pathname: string): Promise<void> {
		window.history.pushState(null, '', super.link(pathname));
		return super.goto(pathname);
	}
	currentPathname() {
		const prefix = this.link('');
		const pathname = window.location.pathname;

		if (prefix === '') return pathname;

		return pathname.split(prefix)[1];
	}
	back() {
		window.history.back();
	}
	forward() {
		window.history.forward();
	}
	go(delta: number | undefined) {
		window.history.go(delta);
	}
	// Goes back, and if there is no page saved in the history of the app,
	// goes back up to the root of the previous level of the pathname
	pop(parentPath: string = '') {
		const previousPathname = this.currentPathname();
		window.history.back();

		setTimeout(() => {
			if (this.currentPathname() === previousPathname) {
				this.goto(this.link(parentPath));
			}
		});
	}
}
