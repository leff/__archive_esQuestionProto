//Bone headed Dependency Injector.
//Enough for Proof of Concept, but we'd probably want to find something more robust.
//and less clunky to use.
//and something it's easier to configure per test/test module.
function DependencyInjector() {
    this.deps = {};
}
DependencyInjector.prototype.register = function (name, classRef) {
    this.deps[name] = classRef;
}
DependencyInjector.prototype.get = function(name) {
    var deps = this.deps, depName = name;
    var resolve_dependency = function resolve_dependency() {
        return deps[depName];
    }
    //defer resolution until required
    //necessary for collection views. they need to lookup the mock ItemViews, which are re-registered.
    return resolve_dependency;
}
DependencyInjector.prototype.getNew = function(name, args) {
    //happens right away, so closure magic of .get is not needed
    return new this.deps[name](args);
}
var di = new DependencyInjector();




di.register('QuestionDataModel', Backbone.Model.extend({
    defaults: {
        field: '',
        val: ''
    }
}));

di.register('QuestionMeta', Backbone.Model.extend({
    defaults: {
        question_text: '',
        help_text: '',
        answer_type: '' //Select, Slider, Etc
    }
}));

di.register('QuestionMetaStack', Backbone.Collection.extend({
    model: di.get('QuestionMeta')
}));



//
// Question asks a single question
// it can either accept an input or ask a followup question
//
// it has a Answers View, which is responsible for collecting the input,
// which can be of any type
//
// In other words, Question encapsulates the common stuff about asking a question
// without saying anything about how that question is answered
//
di.register('Question', Marionette.Layout.extend({
    template: '#question',

    ui: {
        reset: '.reset'
    },

    regions: {
        answers: '.answers'
    },

    events: {
        'click @ui.reset': 'onResetClick'
    },

    initialize: function() {
        this.$el.addClass('question-box expanded');
        var that = this;

        this.answers.on('show', function(view){
            that.listenTo(view, 'dataWasInput', that.onDataInput);
            that.listenTo(view, 'followupRequested', that.onFollowupRequested);
        });
    },

    onRender: function() {
        var answer_type = this.model.get('answer_type');

        var answers = di.getNew(answer_type, {details: this.model.get('answer_details')} );
        this.answers.show(answers);
    },

    collapse_ui: function() {
        this.$el.removeClass('expanded').addClass('collapsed');
    },
    expand_ui: function() {
        this.$el.removeClass('collapsed').addClass('expanded');
    },
    onDataInput: function(data) { this.trigger('dataWasInput', data); },
    onFollowupRequested: function(followup) { this.trigger('followupRequested', followup); },
    onResetClick: function() { this.trigger('resetRequested'); }
}));

//
// QuestionStack is a collection of Questions
//
//
di.register('QuestionStack', Marionette.CollectionView.extend({
    getItemView: function() {
        return di.get('Question')();
    },

    itemEvents: {
        dataWasInput: 'onDataInput',
        followupRequested: 'onFollowupRequested',
        resetRequested: 'onResetRequested'
    },

    onDataInput: function(event_name, child, data) { this.trigger('dataWasInput', data); },

    onFollowupRequested: function(event_name, child, followup) {
        // QuestionStack can handle the whole ui operation
        // but QuestionAsker needs to know to reset the data.
        this.trigger('resetRequested');
        this.children.each(function(q) {
            q.collapse_ui();
        });
        this.collection.add( di.getNew('QuestionMeta', followup) );
    },

    onResetRequested: function(event_name, child) {
        while( this.collection.last() != child.model ) {
            this.collection.pop();
        }
        this.children.last().expand_ui();
        this.trigger('resetRequested');
    }
}));


//
// QuestionAsker is the interface between the
// page/form and the complicated way we ask questions in the UI
//
// It handles the many to many mapping between
// data we are collecting, and
// the questions we ask to find the data
//
// Therefore it is responsible for things that are 1 to 1 with
// the data model, such as 'done-ness' and 'valid-ness'
//
di.register('QuestionAsker', Marionette.Layout.extend({
    template: '#question_asker',
    regions: {
        quesiton_stack: '.question-stack',
        status: '.status',
        error: '.error'
    },

    modelEvents: {
        change: 'onModelChange'
    },

    initialize: function() {
        var that = this;

        this.quesiton_stack.on('show', function(view){
            that.listenTo(view, 'dataWasInput', that.onDataInput);
            that.listenTo(view, 'resetRequested', that.onResetRequested);
        });
    },

    onRender: function() {
        this.question_meta_model = di.getNew('QuestionMetaStack');
        this.question_meta_model.add( di.getNew('QuestionMeta', this.options.question_definition) );
        this.quesiton_stack.show( di.getNew('QuestionStack', {collection: this.question_meta_model}) );
    },

    onDataInput: function(data) {
        this.model.set('val', data);
        //trigger done ui state
    },

    onResetRequested: function() {
        // could possibly use model.unset. not sure if it matters.
        this.model.set('val', undefined);
    },

    onModelChange: function() {
        var data = this.model.get('val');
        console.log('data is now', data);
    }
}));




di.register('SelectAnswersModel', Backbone.Model.extend({
    defaults: {
        answers: []
    }
}));

// SelectAnswers is a type of AnswerView
// Ie, it can be slotted in to the Answers spot of a Question
di.register('SelectAnswers',Marionette.ItemView.extend({
    template: '#select_answers',

    ui: {
        some_input: '.an_input',
        answer: '.answer'
    },

    events: {
        'click @ui.answer': 'onAnswerClick'
    },

    initialize: function() {
        this.model = di.getNew('SelectAnswersModel', this.options.details);

        this.answers = this.options.details.answers;
    },

    serializeData: function() {
        return {
            answers: this.answers
        };
    },

    onAnswerClick: function(evt) {
        var selected_data_id = parseInt( $(evt.target).attr('data-id'), 10 );
        var answer = _.findWhere(this.answers, {id: selected_data_id});
        if( answer.val ) {
            this.trigger( 'dataWasInput',  answer.val);
        } else if (answer.followup) {
            this.trigger( 'followupRequested', answer.followup );
        }
    }
}));


