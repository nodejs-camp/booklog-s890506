/**
 * SETUP
 **/
  var app = app || {};

/**
 * MODELS
 **/
app.Search = Backbone.Model.extend({  
  url: function() {
    return 'http://localhost:3000/1/post/tag/' + this.attributes.tag
  },
  tag: '',
  defaults: {
    success: false,
    errors: [],
    errfor: {},
    
    posts: [{
           "_id": '',
           "subject": ''
       }]
  }
});

app.Post = Backbone.Model.extend({  
  url: 'http://localhost:3000/1/post',
  defaults: {
    success: false,
    errors: [],
    errfor: {},
    
    posts: [{
           "content": "hello",
           "_id": "5402de2f559097cdf139fff9",
           "subject": "abc123"
       }]
  }
});

/**
 * VIEWS
 **/
  app.SearchView = Backbone.View.extend({
    el: '#search-section',
    events: {
      'click .btn-search': 'performSearch'
    },
    initialize: function() {
        this.model = new app.Search();
        this.template = _.template($('#tmpl-results').html());

        this.model.bind('change', this.render, this);        
    },
    render: function() {
        var data = this.template(this.model.attributes);

        $('#search-result').html(data);

        return this;
    },
    performSearch: function() {
      var tag = this.$el.find('#search-tag').val();

      this.model.set('tag', tag);
      this.model.fetch();
    }
  });

  app.PostView = Backbone.View.extend({
    el: '#blog-post',
    events: {
    },
    initialize: function() {
        this.model = new app.Post();
        this.template = _.template($('#tmpl-post').html());

        this.model.bind('change', this.render, this);
        
        this.model.fetch();
    },
    render: function() {
        var data = this.template(this.model.attributes);

        this.$el.html(data);
        return this;
    }
  });

/**
 * BOOTUP
 **/
  $(document).ready(function() {
    app.postView = new app.PostView();
    app.searchView = new app.SearchView();
  });