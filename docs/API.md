## Functions

<dl>
<dt><a href="#logMiddleware">logMiddleware(ctx, next)</a></dt>
<dd><p>Logging request information.</p>
</dd>
<dt><a href="#createServer">createServer(port)</a> ⇒ <code><a href="#Instance">Instance</a></code></dt>
<dd><p>Create server instance</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Instance">Instance</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="logMiddleware"></a>

## logMiddleware(ctx, next)
Logging request information.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>object</code> | Current context. |
| next | <code>function</code> | next function in koa. |

<a name="createServer"></a>

## createServer(port) ⇒ [<code>Instance</code>](#Instance)
Create server instance

**Kind**: global function  
**Returns**: [<code>Instance</code>](#Instance) - Return instance of server.  

| Param | Type | Description |
| --- | --- | --- |
| port | <code>number</code> | Port to mount. |

<a name="Instance"></a>

## Instance : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| koa | <code>object</code> | Origin koa object. |
| context | <code>object</code> | Alias context of koa. |
| listener | <code>object</code> | HTTP Listener. |
| close | <code>function</code> | Async. Close server instance. |
| listen | <code>function</code> | Async. Start the server. |
| address | <code>function</code> | Get address of server. |

