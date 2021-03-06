import 'mad/component/component';
import 'mad/component/confirm';
import 'app/component/password_workspace_menu';
import 'app/component/breadcrumb/password_breadcrumb';
//import 'app/component/category_actions_tab';
//import 'app/component/category_chooser';
import 'app/component/password_browser';
import 'app/component/resource_actions_tab';
import 'app/component/resource_sidebar';
import 'app/component/resource_shortcuts';
import 'app/component/workspace_secondary_menu';
//import 'app/form/category/create';
import 'app/form/resource/create';
import 'app/model/filter';

import 'app/view/template/password_workspace.ejs!';
import 'app/view/template/component/create_button.ejs!';

/**
 * @inherits {mad.Component}
 * @parent index
 *
 * @constructor
 * Creates a new Password Workspace Controller
 *
 * @param {HTMLElement} element the element this instance operates on.
 * @param {Object} [options] option values for the controller.  These get added to
 * this.options and merged with defaults static variable
 * @return {passbolt.component.PasswordWorkspace}
 */
var PasswordWorkspace = passbolt.component.PasswordWorkspace = mad.Component.extend('passbolt.component.PasswordWorkspace', /** @static */ {

	defaults: {
		label: 'Password',
		templateUri: 'app/view/template/password_workspace.ejs',
		// The current selected resources
		selectedRs: new can.Model.List(),
		// The current filter
		filter: new passbolt.model.Filter(),
		// Override the silentLoading parameter.
		silentLoading: false
	},

	/**
	 * Return the default filter used to filter the workspace
	 * @return {passbolt.model.Filter}
	 */
	getDefaultFilterSettings: function() {
		return new passbolt.model.Filter({
			label: __('All items'),
			order: 'modified',
			case: 'all_items',
			type: passbolt.model.Filter.SHORTCUT,
			keywords: ''
		});
	}

}, /** @prototype */ {

	/**
	 * After start hook.
	 * @see {mad.Component}
	 */
	afterStart: function() {
		// Instantiate the primary workspace menu controller outside of the workspace container, destroy it when the workspace is destroyed
		var primWkMenu = mad.helper.Component.create(
			$('#js_wsp_primary_menu_wrapper'),
			'last',
			passbolt.component.PasswordWorkspaceMenu, {
				selectedRs: this.options.selectedRs
			}
		);
		primWkMenu.start();

		// Instantiate the secondary workspace menu controller outside of the workspace container, destroy it when the workspace is destroyed
		var secWkMenu = mad.helper.Component.create(
			$('#js_wsp_secondary_menu_wrapper'),
			'last',
			passbolt.component.WorkspaceSecondaryMenu, {
                selectedItems: this.options.selectedRs
            }
		);
		secWkMenu.start();

		// Instantiate the create button controller.
		this.options.createButton = mad.helper.Component.create(
			$('.main-action-wrapper'),
			'last',
			mad.component.Button, {
				id: 'js_wsp_create_button',
				templateBased: true,
				templateUri: 'app/view/template/component/create_button.ejs',
				tag: 'a',
				cssClasses: ['button', 'primary']
			}
		).start();

		// Instanciate the passwords filter controller
		var rsShortcut = new passbolt.component.ResourceShortcuts('#js_wsp_pwd_filter_shortcuts', {});
		rsShortcut.start();

		// Removed the lines below for #PASSBOLT-787
		// Instanciate the categories chooser controller
		//this.catChooser = new passbolt.component.CategoryChooserController('#js_wsp_pwd_category_chooser', {});
		//this.catChooser.start();

		// Instantiate the password workspace breadcrumb controller
		this.breadcrumCtl = new passbolt.component.PasswordBreadcrumb($('#js_wsp_password_breadcrumb'), {});
		this.breadcrumCtl.start();

		// Instantiate the passwords browser controller
		var passwordBrowserController = new passbolt.component.PasswordBrowser('#js_wsp_pwd_browser', {
			selectedRs: this.options.selectedRs
		});
		passwordBrowserController.start();

		// Instanciate the resource details controller
		var resourceSidebar = new passbolt.component.ResourceSidebar($('.js_wsp_pwd_sidebar_second', this.element), {
			selectedItems: this.options.selectedRs
		});
        // Hide the sidebar by default.
		// @todo Hide a DOM Element from a Component is not recommanded.
		// @todo If it's a default behavior the sidebar should be hidden in the template.
        $('.js_wsp_pwd_sidebar_second', this.element).hide();

		// Filter the workspace
		var filter = this.constructor.getDefaultFilterSettings();
		mad.bus.trigger('filter_workspace', filter);

		this.on();
	},

	/**
	 * Destroy the workspace.
	 */
	destroy: function() {
		// Be sure that the primary & secondary workspace menus controllers will be destroyed also.
		$('#js_wsp_primary_menu_wrapper').empty();
		$('#js_wsp_secondary_menu_wrapper').empty();
		$('.main-action-wrapper').empty();

        // Destroy Selected resource.
        this.options.selectedRs.splice(0, this.options.selectedRs.length);

        // Call parent.
		this._super();
	},

	/* ************************************************************** */
	/* LISTEN TO THE APP EVENTS */
	/* ************************************************************** */

	/**
	 * Observe when the user wants to create a new instance
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 */
	'{createButton.element} click': function (el, ev) {
		var category = this.options.createButton.getValue();
		mad.bus.trigger('request_resource_creation', category);
	},

	/**
	 * When a new filter is applied to the workspace.
	 * @param {jQuery} element The source element
	 * @param {Event} event The jQuery event
	 * @param {passbolt.model.Filter} filter The filter to apply
	 */
	'{mad.bus.element} filter_workspace': function (element, evt, filter) {
		// When filtering the resources browser, unselect all the resources.
		this.options.selectedRs.splice(0, this.options.selectedRs.length);

		// Change the state of the create but regarding the selected categories.
		var categories = filter.getForeignModels('Category'),
			createButtonState = 'ready';

		// If no categories selected, the user is allowed to create password. These
		// passwords won't be associated to any category.
		if (!categories) {
			// Reset the value carried by the button.
			this.options.createButton.setValue(new can.List([]));
		} else {
			// The button will now carry the latest selected categories.
			this.options.createButton.setValue(categories);

			// If the user doesn't have the permission to create into the selected category.
			// Or if multiple categories selected.
			if (categories.length > 1 || (
				categories.length == 1 &&
				!passbolt.model.Permission.isAllowedTo(categories[0], passbolt.CREATE))
			) {
				createButtonState = 'disabled';
			}
		}

		this.options.createButton.setState(createButtonState);
	},

	/**
	 * Observe when category is selected
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {passbolt.model.Category} category The selected category
	 */
	'{mad.bus.element} category_selected': function (el, ev, category) {
		// reset the selected resources
		this.options.selectedRs.splice(0, this.options.selectedRs.length);
		// Set the new filter
		this.options.filter.attr({
			foreignModels: {
				Category: new can.List([category])
			},
			type: passbolt.model.Filter.FOREIGN_MODEL
		});
		// propagate a special event on bus
		mad.bus.trigger('filter_resources_browser', this.options.filter);
	},

	/**
	 * Observe when the user requests a category creation
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 */
	'{mad.bus.element} request_category_creation': function (el, ev, data) {
		var category = new passbolt.model.Category({ parent_id: data.id });

		// get the dialog
		var dialog = new mad.component.Dialog(null, {
			label: __('Create a new Category'),
            cssClasses : ['edit-category-dialog', 'dialog-wrapper']
		}).start();

		// attach the component to the dialog
		var form = dialog.add(passbolt.form.category.Create, {
			data: category,
			callbacks : {
				submit: function (data) {
					var instance = new passbolt.model.Category(data['passbolt.model.Category'])
						.save();
					dialog.remove();
				}
			}
		});

		form.load(category);
	},

	/**
	 * Observe when the user requests a category edition
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 */
	'{mad.bus.element} request_category_edition': function (el, ev, category) {
		// get the dialog
		var dialog = new mad.component.Dialog(null, {
            label: __('Edit a Category'),
            cssClasses : ['edit-category-dialog', 'dialog-wrapper']
        }).start();

		// Instanciate the Resource Actions Tab Controller into the dialog
		var tab = dialog.add(passbolt.component.CategoryActionsTab, {
			category: category
		});
		tab.enableTab('js_cat_edit');
	},

	/**
	 * Observe when the user requests a category sharing
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 */
	'{mad.bus.element} request_category_sharing': function (el, ev, category) {
		// get the dialog
		var dialog = new mad.component.Dialog(null, {
            label: __('Share a Category'),
            cssClasses : ['share-category-dialog', 'dialog-wrapper']
        }).start();

		// Instanciate the Resource Actions Tab Controller into the dialog
		var tab = dialog.add(passbolt.component.CategoryActionsTab, {
			category: category
		});
		tab.enableTab('js_cat_permission');
	},

	/**
	 * Observe when the user requests a category deletion
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 */
	'{mad.bus.element} request_category_deletion': function (el, ev, category) {
		category.destroy();
	},

	/**
	 * Observe when the user requests a resource creation
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {passbolt.model.Category} categories The target categories to insert the resource
	 */
	'{mad.bus.element} request_resource_creation': function (el, ev, categories) {
		if(typeof categories == 'undefined') {
			categories = [];
		} else if (!$.isArray(categories)) {
			categories = [categories];
		}
		// create the resource which will be used by the form builder to populate the fields
		var resource = new passbolt.model.Resource({ Category: categories });

		// get the dialog
		var dialog = new mad.component.Dialog(null, {
			label: __('Create Password'),
            cssClasses : ['create-password-dialog', 'dialog-wrapper']
		}).start();

		// attach the component to the dialog
		var form = dialog.add(passbolt.form.resource.Create, {
			data: resource,
			callbacks : {
				submit: function (data) {
					var rs = new passbolt.model.Resource(data['passbolt.model.Resource']);
					rs.save();
					dialog.remove();
				}
			}
		});
		form.load(resource);
	},

	/**
	 * Observe when the user requests a resource edition
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {passbolt.model.Resource} resource The target resource to edit
	 */
	'{mad.bus.element} request_resource_edition': function (el, ev, resource) {
		// get the dialog
		var dialog = new mad.component.Dialog(null, {
			label: __('Edit Password'),
            cssClasses : ['edit-password-dialog', 'dialog-wrapper']
		}).start();

		// Instanciate the Resource Actions Tab Controller into the dialog
		var tab = dialog.add(passbolt.component.ResourceActionsTab, {
			resource: resource
		});
		tab.enableTab('js_rs_edit');
	},

	/**
	 * Observe when the user requests a resource deletion
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {passbolt.model.Resource} rs1 A target resource to delete
	 * @param {passbolt.model.Resource} [rs2 ...] Other resources to delete
	 */
	'{mad.bus.element} request_resource_deletion': function (el, ev) {
		var args = arguments;
		var confirm = new mad.component.Confirm(
			null,
			{
				label: __('Do you really want to delete password ?'),
				content: __('Please confirm you really want to delete the password. After clicking ok, it will be deleted permanently.'),
				action: function() {
					for (var i=2; i < args.length; i++) {
						var rs = args[i];
						if (!(rs instanceof passbolt.model.Resource)) {
							throw passbolt.Exception.get('The parameter [%0] should be an instance of passbolt.model.Resource', i);
						}
						rs.destroy();
					}
				}
			}
		).start();
	},

	/**
	 * Observe when the user requests a resource deletion
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {passbolt.model.Resource} rs1 A target resource to delete
	 * @param {passbolt.model.Resource} [rs2 ...] Other resources to delete
	 */
	'{mad.bus.element} request_resource_sharing': function (el, ev, resource) {
		// get the dialog
		var dialog = new mad.component.Dialog(null, {
            label: __('Share Password'),
            cssClasses : ['share-password-dialog', 'dialog-wrapper']
        }).start();

		// Instanciate the Resource Actions Tab Controller into the dialog
		var tab = dialog.add(passbolt.component.ResourceActionsTab, {
			resource: resource
		});
		tab.enableTab('js_rs_permission');
	},

	/**
	 * Observe when the user requests to set an instance as favorite
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {jQuery.Deferred.Promise} promise The caller join a promise to complete, don't disapoint him !
	 * @param {passbolt.model.Model} instance The target instance to set as favorite
	 */
	'{mad.bus.element} request_favorite': function (el, ev, promise, instance) {
		// Data expected to save a resource as favorite.
		var data = {
			foreign_model: 'resource',
			foreign_id: instance.id
		};

		// Save the given resource as favorite.
		new passbolt.model.Favorite(data)
			.save()
			.then(function(favorite){
				// Update the instance with the favorite data received from the back-end.
				instance.Favorite = favorite;
				// Notify can that the instance has been updated.
				// All subscribers will be notified about that change. By instance the password
				// browser (grid) will update the row of a resource.
				can.trigger(passbolt.model.Resource, 'updated', instance);
				// Notify the request caller by resolving the promise given in parameter of
				// the request.
				promise.resolve();
			})
			.fail(function(error){
				// Notify the request caller by rejecting the promise given in parameter of
				// the request.
				promise.reject();
			});
	},

	/**
	 * Observe when the user requests to unset an instance as favorite
	 * @param {HTMLElement} el The element the event occurred on
	 * @param {HTMLEvent} ev The event which occurred
	 * @param {jQuery.Deferred.Promise} promise The caller join a promise to complete, don't disapoint him !
	 * @param {passbolt.model.Model} instance The target instance to unset as favorite
	 */
	'{mad.bus.element} request_unfavorite': function (el, ev, promise, instance) {
		// Unfavorite the given resource.
		instance.Favorite.destroy()
			.then(function() {
				// Update the resource.
				instance.Favorite = null;
				// Notify can that the instance has been updated.
				// All subscribers will be notified about that change. By instance the password
				// browser (grid) will update the row of a resource.
				can.trigger(passbolt.model.Resource, 'updated', instance);
				// Notify the request caller by resolving the promise given in parameter of
				// the request.
				promise.resolve();
			})
			.fail(function(jqXHR, status, response, request) {
				// Notify the request caller by rejecting the promise given in parameter of
				// the request.
				promise.rejectWith(promise, [jqXHR, status, response, request]);
			});
	}

});

export default PasswordWorkspace;
