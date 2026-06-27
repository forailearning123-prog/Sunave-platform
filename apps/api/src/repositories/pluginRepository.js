// Plugin Repository
// Data access layer for plugin platform

const { v4: uuidv4 } = require('uuid');

class PluginRepository {
  constructor(db) {
    this.db = db;
  }

  // ─── Plugin CRUD ─────────────────────────────────────────────────────────────

  async create(pluginData) {
    const id = pluginData.id || uuidv4();
    const query = `
      INSERT INTO plugins (
        id, organization_id, name, display_name, description, author, organization,
        version, category, license, homepage, repository, documentation,
        icon, banner, status, visibility, compatibility, minimum_platform_version,
        permissions, dependencies, peer_dependencies, required_capabilities,
        required_workers, required_agents, required_settings, configuration_schema,
        entry_point, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      pluginData.organizationId,
      pluginData.name,
      pluginData.displayName || pluginData.name,
      pluginData.description || '',
      pluginData.author,
      pluginData.organization || null,
      pluginData.version || '1.0.0',
      pluginData.category,
      pluginData.license || 'MIT',
      pluginData.homepage || null,
      pluginData.repository || null,
      pluginData.documentation || null,
      pluginData.icon || 'puzzle',
      pluginData.banner || null,
      pluginData.status || 'draft',
      pluginData.visibility || 'private',
      JSON.stringify(pluginData.compatibility || {}),
      pluginData.minimumPlatformVersion || '1.0.0',
      JSON.stringify(pluginData.permissions || []),
      JSON.stringify(pluginData.dependencies || []),
      JSON.stringify(pluginData.peerDependencies || []),
      JSON.stringify(pluginData.requiredCapabilities || []),
      JSON.stringify(pluginData.requiredWorkers || []),
      JSON.stringify(pluginData.requiredAgents || []),
      JSON.stringify(pluginData.requiredSettings || []),
      JSON.stringify(pluginData.configurationSchema || {}),
      pluginData.entryPoint
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToPlugin(result.rows[0]);
  }

  async findById(id) {
    const query = 'SELECT * FROM plugins WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToPlugin(result.rows[0]) : null;
  }

  async findByName(name, organizationId) {
    const query = `
      SELECT * FROM plugins 
      WHERE name = $1 AND organization_id = $2
    `;
    const result = await this.db.query(query, [name, organizationId]);
    return result.rows[0] ? this.mapRowToPlugin(result.rows[0]) : null;
  }

  async findByOrganization(organizationId, filters = {}) {
    let query = 'SELECT * FROM plugins WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 1;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.visibility) {
      paramCount++;
      query += ` AND visibility = $${paramCount}`;
      params.push(filters.visibility);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToPlugin(row));
  }

  async update(id, updates) {
    const allowedFields = [
      'name', 'display_name', 'description', 'author', 'organization',
      'version', 'category', 'license', 'homepage', 'repository', 'documentation',
      'icon', 'banner', 'status', 'visibility', 'compatibility',
      'minimum_platform_version', 'permissions', 'dependencies', 'peer_dependencies',
      'required_capabilities', 'required_workers', 'required_agents',
      'required_settings', 'configuration_schema', 'entry_point'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE plugins 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToPlugin(result.rows[0]) : null;
  }

  async delete(id) {
    const query = 'DELETE FROM plugins WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async exists(id) {
    const query = 'SELECT EXISTS(SELECT 1 FROM plugins WHERE id = $1)';
    const result = await this.db.query(query, [id]);
    return result.rows[0].exists;
  }

  // ─── Plugin Versions ──────────────────────────────────────────────────────────

  async createVersion(versionData) {
    const id = versionData.id || uuidv4();
    const query = `
      INSERT INTO plugin_versions (
        id, plugin_id, version, changelog, manifest, is_current,
        published_at, published_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      versionData.pluginId,
      versionData.version,
      versionData.changelog || null,
      JSON.stringify(versionData.manifest || {}),
      versionData.isCurrent || false,
      versionData.publishedAt || null,
      versionData.publishedBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToPluginVersion(result.rows[0]);
  }

  async findVersionById(id) {
    const query = 'SELECT * FROM plugin_versions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToPluginVersion(result.rows[0]) : null;
  }

  async findVersionsByPlugin(pluginId) {
    const query = `
      SELECT * FROM plugin_versions 
      WHERE plugin_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [pluginId]);
    return result.rows.map(row => this.mapRowToPluginVersion(row));
  }

  async findCurrentVersion(pluginId) {
    const query = `
      SELECT * FROM plugin_versions 
      WHERE plugin_id = $1 AND is_current = true
    `;
    const result = await this.db.query(query, [pluginId]);
    return result.rows[0] ? this.mapRowToPluginVersion(result.rows[0]) : null;
  }

  async setCurrentVersion(pluginId, versionId) {
    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');
      
      // Unset all current versions for this plugin
      await client.query(
        'UPDATE plugin_versions SET is_current = false WHERE plugin_id = $1',
        [pluginId]
      );
      
      // Set the new current version
      await client.query(
        'UPDATE plugin_versions SET is_current = true WHERE id = $1 AND plugin_id = $2',
        [versionId, pluginId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ─── Plugin Installations ─────────────────────────────────────────────────────

  async createInstallation(installationData) {
    const id = installationData.id || uuidv4();
    const query = `
      INSERT INTO plugin_installations (
        id, plugin_id, plugin_version_id, organization_id, installed_by,
        status, configuration, enabled_at, disabled_at, last_health_check,
        installed_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      installationData.pluginId,
      installationData.pluginVersionId,
      installationData.organizationId,
      installationData.installedBy || null,
      installationData.status || 'installed',
      JSON.stringify(installationData.configuration || {}),
      installationData.enabledAt || null,
      installationData.disabledAt || null,
      installationData.lastHealthCheck || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToInstallation(result.rows[0]);
  }

  async findInstallationById(id) {
    const query = 'SELECT * FROM plugin_installations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToInstallation(result.rows[0]) : null;
  }

  async findInstallationByPluginAndOrg(pluginId, organizationId) {
    const query = `
      SELECT * FROM plugin_installations 
      WHERE plugin_id = $1 AND organization_id = $2
    `;
    const result = await this.db.query(query, [pluginId, organizationId]);
    return result.rows[0] ? this.mapRowToInstallation(result.rows[0]) : null;
  }

  async findInstallationsByOrganization(organizationId, filters = {}) {
    let query = `
      SELECT pi.*, p.name as plugin_name, p.display_name as plugin_display_name,
             p.icon as plugin_icon, pv.version as installed_version
      FROM plugin_installations pi
      JOIN plugins p ON pi.plugin_id = p.id
      JOIN plugin_versions pv ON pi.plugin_version_id = pv.id
      WHERE pi.organization_id = $1
    `;
    const params = [organizationId];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      query += ` AND pi.status = $${paramCount}`;
      params.push(filters.status);
    }

    query += ' ORDER BY pi.installed_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => ({
      ...this.mapRowToInstallation(row),
      pluginName: row.plugin_name,
      pluginDisplayName: row.plugin_display_name,
      pluginIcon: row.plugin_icon,
      installedVersion: row.installed_version
    }));
  }

  async updateInstallation(id, updates) {
    const allowedFields = [
      'status', 'configuration', 'enabled_at', 'disabled_at', 'last_health_check'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE plugin_installations 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToInstallation(result.rows[0]) : null;
  }

  async deleteInstallation(id) {
    const query = 'DELETE FROM plugin_installations WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  // ─── Plugin Permissions ───────────────────────────────────────────────────────

  async createPermission(permissionData) {
    const id = permissionData.id || uuidv4();
    const query = `
      INSERT INTO plugin_permissions (
        id, plugin_id, installation_id, organization_id, permission,
        description, granted, granted_by, granted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      permissionData.pluginId,
      permissionData.installationId || null,
      permissionData.organizationId,
      permissionData.permission,
      permissionData.description || null,
      permissionData.granted !== undefined ? permissionData.granted : true,
      permissionData.grantedBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToPermission(result.rows[0]);
  }

  async findPermissionsByPlugin(pluginId) {
    const query = `
      SELECT * FROM plugin_permissions WHERE plugin_id = $1
    `;
    const result = await this.db.query(query, [pluginId]);
    return result.rows.map(row => this.mapRowToPermission(row));
  }

  async findPermissionsByInstallation(installationId) {
    const query = `
      SELECT * FROM plugin_permissions WHERE installation_id = $1
    `;
    const result = await this.db.query(query, [installationId]);
    return result.rows.map(row => this.mapRowToPermission(row));
  }

  async updatePermission(id, updates) {
    const setClause = [];
    const params = [];
    let paramCount = 0;

    if (updates.granted !== undefined) {
      paramCount++;
      setClause.push(`granted = $${paramCount}`);
      params.push(updates.granted);
    }

    if (updates.description !== undefined) {
      paramCount++;
      setClause.push(`description = $${paramCount}`);
      params.push(updates.description);
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);

    const query = `
      UPDATE plugin_permissions 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToPermission(result.rows[0]) : null;
  }

  // ─── Plugin Configurations ────────────────────────────────────────────────────

  async setConfiguration(configData) {
    const query = `
      INSERT INTO plugin_configurations (
        plugin_id, installation_id, organization_id, config_key,
        config_value, is_sensitive, updated_by, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      ) ON CONFLICT (installation_id, config_key) 
      DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        is_sensitive = EXCLUDED.is_sensitive,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `;
    
    const params = [
      configData.pluginId,
      configData.installationId,
      configData.organizationId,
      configData.configKey,
      JSON.stringify(configData.configValue || {}),
      configData.isSensitive || false,
      configData.updatedBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToConfiguration(result.rows[0]);
  }

  async findConfigurationsByInstallation(installationId) {
    const query = `
      SELECT * FROM plugin_configurations 
      WHERE installation_id = $1
    `;
    const result = await this.db.query(query, [installationId]);
    return result.rows.map(row => this.mapRowToConfiguration(row));
  }

  async findConfigurationByKey(installationId, configKey) {
    const query = `
      SELECT * FROM plugin_configurations 
      WHERE installation_id = $1 AND config_key = $2
    `;
    const result = await this.db.query(query, [installationId, configKey]);
    return result.rows[0] ? this.mapRowToConfiguration(result.rows[0]) : null;
  }

  async deleteConfiguration(installationId, configKey) {
    const query = `
      DELETE FROM plugin_configurations 
      WHERE installation_id = $1 AND config_key = $2
      RETURNING id
    `;
    const result = await this.db.query(query, [installationId, configKey]);
    return result.rows.length > 0;
  }

  // ─── Plugin Dependencies ──────────────────────────────────────────────────────

  async createDependency(dependencyData) {
    const id = dependencyData.id || uuidv4();
    const query = `
      INSERT INTO plugin_dependencies (
        id, plugin_id, depends_on_plugin_id, version_constraint, is_optional, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      dependencyData.pluginId,
      dependencyData.dependsOnPluginId,
      dependencyData.versionConstraint || '*',
      dependencyData.isOptional || false
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToDependency(result.rows[0]);
  }

  async findDependenciesByPlugin(pluginId) {
    const query = `
      SELECT pd.*, p.name as depends_on_name, pv.version as depends_on_version
      FROM plugin_dependencies pd
      JOIN plugins p ON pd.depends_on_plugin_id = p.id
      LEFT JOIN plugin_versions pv ON p.id = pv.plugin_id AND pv.is_current = true
      WHERE pd.plugin_id = $1
    `;
    const result = await this.db.query(query, [pluginId]);
    return result.rows.map(row => ({
      ...this.mapRowToDependency(row),
      dependsOnName: row.depends_on_name,
      dependsOnVersion: row.depends_on_version
    }));
  }

  async deleteDependency(pluginId, dependsOnPluginId) {
    const query = `
      DELETE FROM plugin_dependencies 
      WHERE plugin_id = $1 AND depends_on_plugin_id = $2
      RETURNING id
    `;
    const result = await this.db.query(query, [pluginId, dependsOnPluginId]);
    return result.rows.length > 0;
  }

  // ─── Plugin Health ────────────────────────────────────────────────────────────

  async createOrUpdateHealth(healthData) {
    const query = `
      INSERT INTO plugin_health (
        plugin_id, installation_id, organization_id, status,
        last_check_at, last_success_at, last_error_at, last_error_message,
        metrics, uptime_percentage, check_count, error_count, updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, NOW()
      ) ON CONFLICT (installation_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        last_check_at = EXCLUDED.last_check_at,
        last_success_at = EXCLUDED.last_success_at,
        last_error_at = EXCLUDED.last_error_at,
        last_error_message = EXCLUDED.last_error_message,
        metrics = EXCLUDED.metrics,
        uptime_percentage = EXCLUDED.uptime_percentage,
        check_count = EXCLUDED.check_count,
        error_count = EXCLUDED.error_count,
        updated_at = NOW()
      RETURNING *
    `;
    
    const params = [
      healthData.pluginId,
      healthData.installationId,
      healthData.organizationId,
      healthData.status,
      healthData.lastSuccessAt,
      healthData.lastErrorAt,
      healthData.lastErrorMessage,
      JSON.stringify(healthData.metrics || {}),
      healthData.uptimePercentage || 100.0,
      healthData.checkCount || 0,
      healthData.errorCount || 0
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToHealth(result.rows[0]);
  }

  async findHealthByInstallation(installationId) {
    const query = `
      SELECT * FROM plugin_health WHERE installation_id = $1
    `;
    const result = await this.db.query(query, [installationId]);
    return result.rows[0] ? this.mapRowToHealth(result.rows[0]) : null;
  }

  async findHealthByOrganization(organizationId) {
    const query = `
      SELECT ph.*, p.name as plugin_name, p.icon as plugin_icon
      FROM plugin_health ph
      JOIN plugins p ON ph.plugin_id = p.id
      WHERE ph.organization_id = $1
      ORDER BY ph.last_check_at DESC
    `;
    const result = await this.db.query(query, [organizationId]);
    return result.rows.map(row => ({
      ...this.mapRowToHealth(row),
      pluginName: row.plugin_name,
      pluginIcon: row.plugin_icon
    }));
  }

  // ─── Plugin Events ────────────────────────────────────────────────────────────

  async createEvent(eventData) {
    const id = eventData.id || uuidv4();
    const query = `
      INSERT INTO plugin_events (
        id, plugin_id, installation_id, organization_id, event_type,
        event_data, level, message, triggered_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      eventData.pluginId || null,
      eventData.installationId || null,
      eventData.organizationId,
      eventData.eventType,
      JSON.stringify(eventData.eventData || {}),
      eventData.level || 'info',
      eventData.message || null,
      eventData.triggeredBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToEvent(result.rows[0]);
  }

  async findEventsByPlugin(pluginId, filters = {}) {
    let query = `
      SELECT * FROM plugin_events 
      WHERE plugin_id = $1
    `;
    const params = [pluginId];
    let paramCount = 1;

    if (filters.installationId) {
      paramCount++;
      query += ` AND installation_id = $${paramCount}`;
      params.push(filters.installationId);
    }

    if (filters.level) {
      paramCount++;
      query += ` AND level = $${paramCount}`;
      params.push(filters.level);
    }

    if (filters.eventType) {
      paramCount++;
      query += ` AND event_type = $${paramCount}`;
      params.push(filters.eventType);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToEvent(row));
  }

  async findEventsByOrganization(organizationId, filters = {}) {
    let query = `
      SELECT * FROM plugin_events 
      WHERE organization_id = $1
    `;
    const params = [organizationId];
    let paramCount = 1;

    if (filters.pluginId) {
      paramCount++;
      query += ` AND plugin_id = $${paramCount}`;
      params.push(filters.pluginId);
    }

    if (filters.level) {
      paramCount++;
      query += ` AND level = $${paramCount}`;
      params.push(filters.level);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToEvent(row));
  }

  // ─── Marketplace ──────────────────────────────────────────────────────────────

  async createMarketplaceItem(itemData) {
    const id = itemData.id || uuidv4();
    const query = `
      INSERT INTO marketplace_items (
        id, plugin_id, name, description, short_description, category,
        icon, thumbnail, documentation_url, version, changelog, tags,
        dependencies, compatibility, is_featured, is_verified,
        install_count, rating_average, rating_count, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      itemData.pluginId,
      itemData.name,
      itemData.description || '',
      itemData.shortDescription || '',
      itemData.category,
      itemData.icon || 'puzzle',
      itemData.thumbnail || null,
      itemData.documentationUrl || null,
      itemData.version,
      itemData.changelog || null,
      itemData.tags || [],
      JSON.stringify(itemData.dependencies || []),
      JSON.stringify(itemData.compatibility || {}),
      itemData.isFeatured || false,
      itemData.isVerified || false,
      itemData.installCount || 0,
      itemData.ratingAverage || 0,
      itemData.ratingCount || 0,
      itemData.status || 'available'
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToMarketplaceItem(result.rows[0]);
  }

  async findMarketplaceItemById(id) {
    const query = 'SELECT * FROM marketplace_items WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToMarketplaceItem(result.rows[0]) : null;
  }

  async findMarketplaceItems(filters = {}) {
    let query = `
      SELECT mi.*, p.name as plugin_name, p.display_name as plugin_display_name,
             p.icon as plugin_icon, p.author as plugin_author
      FROM marketplace_items mi
      JOIN plugins p ON mi.plugin_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      query += ` AND mi.category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND mi.status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.featured !== undefined) {
      paramCount++;
      query += ` AND mi.is_featured = $${paramCount}`;
      params.push(filters.featured);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND mi.tags && $${paramCount}`;
      params.push(filters.tags);
    }

    // Sorting
    if (filters.sort === 'rating') {
      query += ' ORDER BY mi.rating_average DESC';
    } else if (filters.sort === 'installs') {
      query += ' ORDER BY mi.install_count DESC';
    } else if (filters.sort === 'newest') {
      query += ' ORDER BY mi.created_at DESC';
    } else {
      query += ' ORDER BY mi.is_featured DESC, mi.install_count DESC';
    }

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => ({
      ...this.mapRowToMarketplaceItem(row),
      pluginName: row.plugin_name,
      pluginDisplayName: row.plugin_display_name,
      pluginIcon: row.plugin_icon,
      pluginAuthor: row.plugin_author
    }));
  }

  async updateMarketplaceItem(id, updates) {
    const allowedFields = [
      'name', 'description', 'short_description', 'category', 'icon',
      'thumbnail', 'documentation_url', 'version', 'changelog', 'tags',
      'dependencies', 'compatibility', 'is_featured', 'is_verified',
      'install_count', 'rating_average', 'rating_count', 'status'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE marketplace_items 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToMarketplaceItem(result.rows[0]) : null;
  }

  async incrementInstallCount(marketplaceItemId) {
    const query = `
      UPDATE marketplace_items 
      SET install_count = install_count + 1 
      WHERE id = $1
      RETURNING install_count
    `;
    const result = await this.db.query(query, [marketplaceItemId]);
    return result.rows[0]?.install_count || 0;
  }

  // ─── Marketplace Reviews ──────────────────────────────────────────────────────

  async createReview(reviewData) {
    const id = reviewData.id || uuidv4();
    const query = `
      INSERT INTO marketplace_reviews (
        id, marketplace_item_id, user_id, organization_id, rating,
        review, helpful_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) ON CONFLICT (marketplace_item_id, user_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        review = EXCLUDED.review,
        updated_at = NOW()
      RETURNING *
    `;
    
    const params = [
      id,
      reviewData.marketplaceItemId,
      reviewData.userId,
      reviewData.organizationId,
      reviewData.rating,
      reviewData.review || null,
      reviewData.helpfulCount || 0
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToReview(result.rows[0]);
  }

  async findReviewsByMarketplaceItem(marketplaceItemId) {
    const query = `
      SELECT mr.*, u.display_name as user_name
      FROM marketplace_reviews mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.marketplace_item_id = $1
      ORDER BY mr.created_at DESC
    `;
    const result = await this.db.query(query, [marketplaceItemId]);
    return result.rows.map(row => ({
      ...this.mapRowToReview(row),
      userName: row.user_name
    }));
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────────

  mapRowToPlugin(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      author: row.author,
      organization: row.organization,
      version: row.version,
      category: row.category,
      license: row.license,
      homepage: row.homepage,
      repository: row.repository,
      documentation: row.documentation,
      icon: row.icon,
      banner: row.banner,
      status: row.status,
      visibility: row.visibility,
      compatibility: row.compatibility,
      minimumPlatformVersion: row.minimum_platform_version,
      permissions: row.permissions,
      dependencies: row.dependencies,
      peerDependencies: row.peer_dependencies,
      requiredCapabilities: row.required_capabilities,
      requiredWorkers: row.required_workers,
      requiredAgents: row.required_agents,
      requiredSettings: row.required_settings,
      configurationSchema: row.configuration_schema,
      entryPoint: row.entry_point,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToPluginVersion(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      version: row.version,
      changelog: row.changelog,
      manifest: row.manifest,
      isCurrent: row.is_current,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      createdAt: row.created_at
    };
  }

  mapRowToInstallation(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      pluginVersionId: row.plugin_version_id,
      organizationId: row.organization_id,
      installedBy: row.installed_by,
      status: row.status,
      configuration: row.configuration,
      enabledAt: row.enabled_at,
      disabledAt: row.disabled_at,
      lastHealthCheck: row.last_health_check,
      installedAt: row.installed_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToPermission(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      installationId: row.installation_id,
      organizationId: row.organization_id,
      permission: row.permission,
      description: row.description,
      granted: row.granted,
      grantedBy: row.granted_by,
      grantedAt: row.granted_at
    };
  }

  mapRowToConfiguration(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      installationId: row.installation_id,
      organizationId: row.organization_id,
      configKey: row.config_key,
      configValue: row.config_value,
      isSensitive: row.is_sensitive,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at
    };
  }

  mapRowToDependency(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      dependsOnPluginId: row.depends_on_plugin_id,
      versionConstraint: row.version_constraint,
      isOptional: row.is_optional,
      createdAt: row.created_at
    };
  }

  mapRowToHealth(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      installationId: row.installation_id,
      organizationId: row.organization_id,
      status: row.status,
      lastCheckAt: row.last_check_at,
      lastSuccessAt: row.last_success_at,
      lastErrorAt: row.last_error_at,
      lastErrorMessage: row.last_error_message,
      metrics: row.metrics,
      uptimePercentage: parseFloat(row.uptime_percentage),
      checkCount: row.check_count,
      errorCount: row.error_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToEvent(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      installationId: row.installation_id,
      organizationId: row.organization_id,
      eventType: row.event_type,
      eventData: row.event_data,
      level: row.level,
      message: row.message,
      triggeredBy: row.triggered_by,
      createdAt: row.created_at
    };
  }

  mapRowToMarketplaceItem(row) {
    return {
      id: row.id,
      pluginId: row.plugin_id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
      category: row.category,
      icon: row.icon,
      thumbnail: row.thumbnail,
      documentationUrl: row.documentation_url,
      version: row.version,
      changelog: row.changelog,
      tags: row.tags,
      dependencies: row.dependencies,
      compatibility: row.compatibility,
      isFeatured: row.is_featured,
      isVerified: row.is_verified,
      installCount: row.install_count,
      ratingAverage: parseFloat(row.rating_average),
      ratingCount: row.rating_count,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToReview(row) {
    return {
      id: row.id,
      marketplaceItemId: row.marketplace_item_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      rating: row.rating,
      review: row.review,
      helpfulCount: row.helpful_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = PluginRepository;