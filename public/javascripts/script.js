$(function(){
  const API_PATH = 'http://localhost:3000/api/contacts/';
  const checkStatus = response => response.ok ? response.json() : Promise.reject(new Error('Failed to load data from server.'));

  let UI = {
    $main: $('main'),
    $message: $('#message'),
    $contactsSection: $('#contacts'),
    $formContainer: $('#form_container'),
    $form: $('form'),
    $formInputs: $('.input_container input'),
    $hideForm: $('[data-action=hide_form]'),
    $search: $('#search'),
    contactTemplate: Handlebars.compile($('#contactTemplate').html()),

    bindEvents: function() {
      this.$main.on('click', '[data-action=show_form]', this.showForm.bind(this));
      this.$main.on('click', '[data-action=delete]', this.deleteConfirmation.bind(this));
      this.$main.on('click', '.tag', this.filterTag.bind(this));
      this.$formInputs.on('blur', this.handleBlur.bind(this));
      this.$hideForm.on('click', this.hideForm.bind(this));
      this.$form.on('submit', this.handleSubmit.bind(this));
      this.$search.on('input', this.filterSearch.bind(this));
      this.$message.on('click', 'a', this.unfilterTag.bind(this));
    },

    renderAllContacts: function() {
      this.$contactsSection.html("");
      ContactsManager.contacts.forEach(contact => {
        this.renderContact(contact);
      });
    },

    renderContact: function(contact) {
      const context = Object.assign({}, contact);

      context.tags = context.tags ? context.tags.split(',') : [];
      context.contactName = context.full_name.toLowerCase();
      const contactHTML = this.contactTemplate(context);
      this.$contactsSection.append(contactHTML);
    },

    showForm: function(e) {
      e.preventDefault();
      const $button = $(e.target);
      const id = $button.closest('.contact').attr('data-id');
      const intent = $button.attr('data-intent');

      this.renderForm(id, intent);
      this.$main.slideUp();
      this.$formContainer.slideDown();
    },

    hideForm: function(e) {
      e.preventDefault();
      this.$formContainer.slideUp();
      this.$main.slideDown();
    },

    renderForm: function(id, intent) {
      const contact = ContactsManager.findContact(id) || {};

      this.$formContainer.find('h2').text(intent);
      this.$form.attr('data-intent', intent);
      this.$form.attr('data-id', contact.id || "");
      ['full_name', 'email', 'phone_number', 'tags'].forEach(k => {
        this.$form.find(`[name=${k}]`).prop('value', contact[k] || "");
      });
    },

    handleBlur: function(e) {
      const $el = $(e.target);

      $el.siblings('p').remove();
      this.validateControl($el);
    },

    handleSubmit: function(e) {
      e.preventDefault();

      if(this.$form[0].checkValidity()) {
        this.submitForm();
      } else {
        this.validateAllControls();
      }
    },

    validateAllControls: function() {
      $('.input_container input').each((_, el) => {
        this.validateControl($(el));
      });
    },

    validateControl: function($el) {
      if ($el[0].checkValidity()) {
        this.hideValidationErr($el);
      } else {
        this.showValidationErr($el);
      }
    },

    hideValidationErr($el) {
      $el.removeClass('validation_err');
      $el.siblings('p').remove();
    },

    showValidationErr: function($el) {
      const $errMessage = $('<p class="validation_err"></p>');

      if($el[0].validity.valueMissing) {
        $errMessage.text("This is a required field.");
      } else if ($el[0].validity.patternMismatch){
        const field = $el.attr('name').replace('_', ' ');
        $errMessage.text(`Please enter a valid ${field}.`);
      }
      $el.addClass('validation_err');
      $el.after($errMessage);
    },

    submitForm: function() {
      const data = this.formToJSON();
      const intent = this.$form.attr('data-intent');

      switch(intent) {
        case 'Add Contact':
          API.addContact(data);
          break;
        case 'Edit Contact':
          API.editContact(data);
          break;
      }
      this.$hideForm.trigger('click');
    },

    formToJSON: function() {
      let obj = {};
      this.$form.serializeArray().forEach(input => obj[input.name] = input.value);
      obj.id = this.$form.attr('data-id') || undefined;
      return obj;
    },

    deleteConfirmation: function(e) {
      e.preventDefault();
      const confirmDelete = confirm("Do you want to delete this contact?");
      if(confirmDelete) {
        const id = $(e.target).parent().attr('data-id');
        API.deleteContact(id);
      }
    },

    filterSearch: function(e) {
      const input = this.$search.val().toLowerCase();
      this.$message.html("");

      if (input.length > 0) {
        const $matches = this.getSearchMatches(input);
        this.showMatches($matches);
      } else {
        $('.contact').show();
      }
    },

    getSearchMatches: function(input) {
      return $('.contact').filter(function() {
        return $(this).attr('data-contact').split(' ').some(function(name) {
          return name.slice(0, input.length) === input;
        });
      });
    },

    showMatches: function($matches) {
      $matches.show();
      $('.contact').not($matches).hide();
      if ($matches.length === 0) {
        this.$message.html("No contacts match this search.");
      }
    },

    filterTag: function(e) {
      e.preventDefault();
      const tag = $(e.target).text();
      $matches = this.getTagMatches(tag);

      this.$message.html(`<p>Displaying contacts tagged with <span class="tag">${tag}</span></p> <a href="#">Show all contacts</a>`);

      $matches.show();
      $('.contact').not($matches).hide();
    },

    getTagMatches: function(tag) {
      return $('.contact').has(`a:contains(${tag.trim()})`);
    },

    unfilterTag: function(e) {
      e.preventDefault();
      this.$message.html("");
      $('.contact').show();
    },
  };

  let API = {
    getAllContacts: function() {
      fetch(API_PATH).then(checkStatus)
        .then(data => {
          ContactsManager.contacts = data;
          UI.renderAllContacts();
        })
        .catch(error => console.log(error));
    },

    addContact: function(data) {
      fetch(API_PATH, {
        method: 'POST',
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(checkStatus)
        .then(contact => {
          ContactsManager.contacts.push(contact);
          UI.renderContact(contact);
        })
        .catch(error => console.log(error));
    },

    editContact: function(data) {
      fetch(API_PATH + data.id, {
        method: 'PUT',
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(checkStatus)
        .then(contact => {
          ContactsManager.updateCollection(contact);
          UI.renderAllContacts(contact);
        })
        .catch(error => console.log(error));
    },

    deleteContact: function(id) {
      fetch(API_PATH + id, {
        method: 'DELETE',
      }).then(response => response.text())
        .then((_) => {
          ContactsManager.deleteFromCollection(id);
          UI.renderAllContacts();
        })
        .catch(error => console.log(error));
    },
  };

  let ContactsManager = {
    contacts: [],

    findContact: function(id) {
      return this.contacts.find(contact => contact.id === Number(id));
    },

    updateCollection: function(updated) {
      const idx = this.contacts.findIndex(contact => contact.id === updated.id);
      this.contacts.splice(idx, 1, updated);
    },

    deleteFromCollection: function(id) {
      const idx = this.contacts.findIndex(contact => Number(id) === contact.id);
      this.contacts.splice(idx, 1);
    },
  };

  App = {
    init: function() {
      API.getAllContacts();
      UI.bindEvents();
    },
  };

  App.init();
});
