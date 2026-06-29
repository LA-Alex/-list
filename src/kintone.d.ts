declare namespace kintone {
  namespace events {
    type Record = {
      record: { [fieldCode: string]: any };
      viewId: number;
      viewName: string;
      [key: string]: any;
    };
    function on(event: string, handler: (event: Record) => any): void;
    function off(event: string, handler: (event: Record) => any): void;
  }
  namespace app {
    function getId(): number | null;
    function getHeaderSpaceElement(): HTMLElement | null;
    function getSpaceElement(id: string): HTMLElement | null;
    function getRecord(): { record: { [fieldCode: string]: any } };
    function getQueryCondition(): string | null;
  }
  function getLoginUser(): { code: string; name: string; };
  function api(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params: object
  ): Promise<any>;
  namespace api {
    function url(path: string, detectGuestSpace: boolean): string;
  }
}