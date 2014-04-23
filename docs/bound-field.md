Bound Field Style
=================

This is based on the idea that a Question is the top level thing, so we can abstract out stuff common to all questions as a fields bound to a model. So when questions need to ask follups they change the model, and the ui auto updates.

This prototype shows that this is technically possible after we implement bound fields, which neither backbone or marionette ship with. I did a really dumb implementation of bound fields where each one has to be a separate view. Ideally we'd use something off the shelf like [Backbone.stickit](http://nytimes.github.io/backbone.stickit/) though I'm not sure how that particular one works with marionette.