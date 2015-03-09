title

> Looking at the components that make up _\[the time to first tweet\]_ measurement, we discovered that the raw parsing and execution of JavaScript caused massive outliers in perceived rendering speed. In our fully client-side architecture, you don't see anything until our JavaScript is [downloaded][1] and executed. The problem is further exacerbated if you do not have a high-specification machine or if you're running an older browser. The bottom line is that a client-side architecture leads to slower performance because most of the code is being executed on our users' machines rather than our own.
> 
> There are a variety of options for improving the performance of our JavaScript, but we wanted to do even better. We took the execution of JavaScript completely out of our render path. By rendering our page content on the server and deferring all JavaScript execution until well after that content has been rendered, we've dropped the time to first Tweet to one-fifth of what it was.

[1]: /download
