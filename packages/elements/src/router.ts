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
		console.log(pathname);
		return super.goto(pathname);
	}
	currentPathname() {
		const prefix = this.link('');
		const pathname = window.location.pathname;

		if (prefix === '') return pathname;

		return pathname.split(prefix)[1];
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
}
